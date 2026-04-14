// Import dinamico per evitare che Next.js traci Playwright nel bundle Vercel.
// Lo scraping gira solo in locale (Vercel serverless non supporta Chromium).

export type ScrapedLead = {
  company_name: string
  phone: string | null
  address: string | null
  google_maps_url: string
  sector: string
  business_type: string | null
  opening_hours: string | null
  website_url: string | null
  rating: number | null
  review_count: number | null
  popularity_score: number | null
}

function computeScore(rating: number | null, reviews: number | null): number | null {
  if (rating == null || reviews == null) return null
  return Math.round(rating * Math.sqrt(reviews))
}

/**
 * Estrae il nome del place dall'URL Google Maps.
 * Es: https://www.google.com/maps/place/La+locanda+del+Tempio/@...
 *     → "La locanda del Tempio"
 */
function nameFromUrl(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@]+)/)
  if (!m) return null
  const raw = decodeURIComponent(m[1]).replace(/\+/g, ' ').trim()
  return raw || null
}

/**
 * Deriva una chiave stabile dall'URL del place per la deduplica.
 * Rimuove il suffisso /@coordinate/... lasciando solo la parte /place/<name>.
 */
function placeKey(url: string): string {
  const m = url.match(/\/maps\/place\/([^/@]+)/)
  return m ? m[1] : url
}

export type ScraperCallbacks = {
  onLog?: (msg: string) => void
  onLead?: (lead: ScrapedLead) => void
}

export async function scrapeGoogleMaps(
  category: string,
  city: string,
  limit: number,
  callbacks: ScraperCallbacks = {},
  includeWithWebsite = false,
): Promise<ScrapedLead[]> {
  const log = (m: string) => callbacks.onLog?.(m)
  log(`[${category}] Avvio browser…`)

  const playwrightModule = 'playwright'
  const { chromium } = (await import(/* webpackIgnore: true */ playwrightModule)) as typeof import('playwright')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    locale: 'it-IT',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    const query = encodeURIComponent(`${category} ${city}`)
    log(`[${category}] Cerco "${category}" a "${city}"…`)
    await page.goto(`https://www.google.com/maps/search/${query}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2500)

    // Consent
    for (const label of ['Accetta tutto', 'Accetta tutti', 'Accept all']) {
      const btn = page.locator(`button:has-text("${label}")`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(1500)
        break
      }
    }

    const results: ScrapedLead[] = []
    const seenKeys = new Set<string>()
    const sidebar = page.locator('[role="feed"]').first()

    log(`[${category}] Carico elenco risultati…`)
    for (let i = 0; i < 15; i++) {
      await sidebar.evaluate((el) => (el.scrollTop = el.scrollHeight)).catch(() => {})
      await page.waitForTimeout(800)
    }

    const listings = await page.locator('[role="feed"] a[href*="/maps/place/"]').all()
    log(`[${category}] ${listings.length} listing in lista, apro uno per uno…`)

    const maxTries = Math.min(listings.length, Math.max(limit * 8, 60))

    for (let idx = 0; idx < maxTries; idx++) {
      const listing = listings[idx]
      try {
        // Leggi l'href del listing PRIMA del click per avere l'URL canonico del place
        const href = await listing.getAttribute('href').catch(() => null)
        const key = href ? placeKey(href) : null
        if (key && seenKeys.has(key)) continue

        await listing.click()
        // Aspetta che l'URL cambi al pattern /maps/place/
        await page
          .waitForURL(/\/maps\/place\//, { timeout: 4000 })
          .catch(() => {})
        await page.waitForTimeout(1100)

        const currentUrl = page.url()
        const currentKey = placeKey(currentUrl)
        if (seenKeys.has(currentKey)) continue

        // Nome affidabile: dall'URL. Fallback: h1 dentro role=main.
        let name = nameFromUrl(currentUrl)
        if (!name) {
          name = await page
            .locator('[role="main"] h1')
            .first()
            .textContent({ timeout: 800 })
            .catch(() => null)
          name = name?.trim() || null
        }
        // Scarta nomi generici che sono header del pannello ricerca
        if (!name || /^(Risultati|Results)$/i.test(name)) continue

        // Estrai il resto dei dati dal pannello detail
        const data = await page.evaluate(() => {
          const main = document.querySelector('[role="main"]') as HTMLElement | null
          const scope: HTMLElement | Document = main || document

          const pickText = (sel: string): string | null => {
            const el = scope.querySelector(sel) as HTMLElement | null
            return el?.innerText?.trim() || null
          }

          const websiteEl = scope.querySelector(
            'a[data-item-id="authority"]',
          ) as HTMLAnchorElement | null
          const websiteUrl = websiteEl?.href || null

          const phone = pickText('[data-item-id^="phone"]')
          const address = pickText('[data-item-id="address"]')

          // Tipo attività (subcategoria Google)
          let businessType: string | null = null
          const typeBtn = scope.querySelector(
            'button[jsaction*="category"]',
          ) as HTMLElement | null
          if (typeBtn) businessType = typeBtn.innerText.trim()

          // Orari
          const hoursEl = scope.querySelector(
            '[data-item-id*="oh"]',
          ) as HTMLElement | null
          const opening = hoursEl?.innerText?.trim().replace(/\s+/g, ' ') || null

          // Rating e recensioni — cerca SOLO dentro il pannello detail
          let rating: number | null = null
          let reviewCount: number | null = null
          // Span con aria-label "X,Y stelle" o pattern "4,3(128)"
          const panelText = (main?.innerText || '').slice(0, 2000)
          const m = panelText.match(/(\d[,.]\d)\s*\((\d+[.,]?\d*)\)/)
          if (m) {
            rating = parseFloat(m[1].replace(',', '.'))
            reviewCount = parseInt(m[2].replace(/[.,]/g, ''), 10)
            if (isNaN(rating)) rating = null
            if (isNaN(reviewCount)) reviewCount = null
          }

          return {
            websiteUrl,
            phone,
            address,
            businessType,
            opening,
            rating,
            reviewCount,
          }
        })

        // Filtro: skip se ha un sito (a meno che l'utente non voglia includerli)
        if (!includeWithWebsite && data.websiteUrl) {
          seenKeys.add(currentKey)
          continue
        }

        seenKeys.add(currentKey)

        const lead: ScrapedLead = {
          company_name: name,
          phone: data.phone,
          address: data.address,
          google_maps_url: currentUrl,
          sector: category,
          business_type: data.businessType,
          opening_hours: data.opening,
          website_url: data.websiteUrl,
          rating: data.rating,
          review_count: data.reviewCount,
          popularity_score: computeScore(data.rating, data.reviewCount),
        }
        results.push(lead)
        callbacks.onLead?.(lead)
        log(
          `[${category}] ✓ ${lead.company_name}${
            lead.rating != null
              ? ` — ★${lead.rating.toFixed(1)} · ${lead.review_count} rec · score ${lead.popularity_score}`
              : ''
          }`,
        )

        if (results.length >= limit) break
      } catch {
        // ignora fallimenti singoli
      }
    }

    log(`[${category}] Categoria completata: ${results.length} lead senza sito`)
    return results
  } finally {
    await browser.close()
  }
}

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

function nameFromUrl(url: string): string | null {
  const m = url.match(/\/maps\/place\/([^/@]+)/)
  if (!m) return null
  const raw = decodeURIComponent(m[1]).replace(/\+/g, ' ').trim()
  return raw || null
}

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

    // Consenso cookie (Italiano + Inglese)
    for (const label of ['Accetta tutto', 'Accetta tutti', 'Accept all', 'Rifiuta tutto', 'Reject all']) {
      const btn = page.locator(`button:has-text("${label}")`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(1500)
        break
      }
    }

    // Attendi che la sidebar con i risultati compaia
    await page
      .locator('[role="feed"]')
      .first()
      .waitFor({ timeout: 8000 })
      .catch(() => {})

    const results: ScrapedLead[] = []
    const seenKeys = new Set<string>()
    const sidebar = page.locator('[role="feed"]').first()

    log(`[${category}] Scorro la lista…`)
    for (let i = 0; i < 12; i++) {
      await sidebar.evaluate((el) => (el.scrollTop = el.scrollHeight)).catch(() => {})
      await page.waitForTimeout(700)
    }

    const listings = await page.locator('[role="feed"] a[href*="/maps/place/"]').all()
    log(`[${category}] ${listings.length} risultati, apro uno per uno…`)

    if (listings.length === 0) {
      log(`[${category}] ⚠️ Nessun risultato — Google Maps potrebbe avere cambiato layout o bloccato la ricerca`)
      return []
    }

    const maxTries = Math.min(listings.length, Math.max(limit * 6, 40))

    for (let idx = 0; idx < maxTries; idx++) {
      const listing = listings[idx]
      try {
        const href = await listing.getAttribute('href').catch(() => null)
        const key = href ? placeKey(href) : null
        if (key && seenKeys.has(key)) continue

        await listing.click({ timeout: 3000 })
        await page.waitForURL(/\/maps\/place\//, { timeout: 5000 }).catch(() => {})
        // Aspetta che l'h1 del pannello detail sia pronto
        await page
          .locator('[role="main"] h1')
          .first()
          .waitFor({ timeout: 3000 })
          .catch(() => {})
        await page.waitForTimeout(600)

        const currentUrl = page.url()
        if (!currentUrl.includes('/maps/place/')) {
          continue
        }
        const currentKey = placeKey(currentUrl)
        if (seenKeys.has(currentKey)) continue
        seenKeys.add(currentKey)

        let name = nameFromUrl(currentUrl)
        if (!name) {
          const h1Text = await page
            .locator('[role="main"] h1')
            .first()
            .textContent({ timeout: 800 })
            .catch(() => null)
          name = h1Text?.trim() || null
        }
        if (!name || /^(Risultati|Results)$/i.test(name)) continue

        // Estrai tutti i dati dal pannello detail con selettori robusti
        const data = await page.evaluate(() => {
          const main = document.querySelector('[role="main"]') as HTMLElement | null
          const scope: HTMLElement | Document = main || document

          // --- Rating ---
          // Cerca aria-label con "X,Y stelle" o "X.Y stars"
          let rating: number | null = null
          const ratingLabels = Array.from(scope.querySelectorAll('[aria-label]'))
          for (const el of ratingLabels) {
            const lbl = el.getAttribute('aria-label') || ''
            const m = lbl.match(/^\s*(\d[,.]\d)\s*stell/i) ||
              lbl.match(/^\s*(\d[,.]\d)\s*star/i)
            if (m) {
              rating = parseFloat(m[1].replace(',', '.'))
              break
            }
          }

          // --- Review count ---
          let reviewCount: number | null = null
          for (const el of ratingLabels) {
            const lbl = el.getAttribute('aria-label') || ''
            const m = lbl.match(/(\d[\d.,]*)\s*recensioni/i) ||
              lbl.match(/(\d[\d.,]*)\s*reviews/i)
            if (m) {
              reviewCount = parseInt(m[1].replace(/[.,\s]/g, ''), 10)
              if (isNaN(reviewCount)) reviewCount = null
              if (reviewCount != null) break
            }
          }

          // --- Phone (molti possibili selettori) ---
          let phone: string | null = null
          const phoneSelectors = [
            'button[data-item-id^="phone:tel:"]',
            'button[data-item-id^="phone"]',
            '[data-item-id^="phone:tel:"]',
            '[data-item-id^="phone"]',
            '[aria-label*="Telefono"]',
            '[aria-label*="telefono"]',
            'a[href^="tel:"]',
          ]
          for (const sel of phoneSelectors) {
            const el = scope.querySelector(sel) as HTMLElement | null
            if (!el) continue
            // Prova prima aria-label, poi testo
            const lbl = el.getAttribute('aria-label') || ''
            const text = el.innerText || ''
            // Cerca pattern numero italiano / internazionale
            const m = (lbl + ' ' + text).match(/(\+?\d[\d\s\-.()]{7,}\d)/)
            if (m) {
              phone = m[1].trim()
              break
            }
          }
          // Fallback: primo href tel: trovato
          if (!phone) {
            const telLink = scope.querySelector('a[href^="tel:"]') as HTMLAnchorElement | null
            if (telLink) phone = telLink.href.replace(/^tel:/, '').trim()
          }

          // --- Address ---
          let address: string | null = null
          const addrSelectors = [
            'button[data-item-id="address"]',
            '[data-item-id="address"]',
            '[aria-label*="Indirizzo"]',
          ]
          for (const sel of addrSelectors) {
            const el = scope.querySelector(sel) as HTMLElement | null
            if (!el) continue
            const lbl = el.getAttribute('aria-label') || ''
            const text = el.innerText || ''
            // L'aria-label tipico è "Indirizzo: Via Roma 1, Milano"
            const clean = lbl.replace(/^Indirizzo:\s*/i, '').trim() || text.trim()
            if (clean) {
              address = clean
              break
            }
          }

          // --- Website ---
          const websiteEl = scope.querySelector(
            'a[data-item-id="authority"], a[data-tooltip="Apri sito"], a[aria-label*="sito web"], a[aria-label*="sito Web"]',
          ) as HTMLAnchorElement | null
          const websiteUrl = websiteEl?.href || null

          // --- Business type (sottocategoria) ---
          let businessType: string | null = null
          const typeBtn = scope.querySelector(
            'button[jsaction*="category"]',
          ) as HTMLElement | null
          if (typeBtn) businessType = typeBtn.innerText.trim() || null

          // --- Orari ---
          let openingHours: string | null = null
          const hoursEl = scope.querySelector(
            '[data-item-id*="oh"], [aria-label*="Orari"]',
          ) as HTMLElement | null
          if (hoursEl) {
            const lbl = hoursEl.getAttribute('aria-label') || ''
            openingHours = (lbl || hoursEl.innerText || '').replace(/\s+/g, ' ').trim() || null
          }

          return {
            rating,
            reviewCount,
            phone,
            address,
            businessType,
            openingHours,
            websiteUrl,
          }
        })

        // Filtro sito web
        if (!includeWithWebsite && data.websiteUrl) continue

        const lead: ScrapedLead = {
          company_name: name,
          phone: data.phone,
          address: data.address,
          google_maps_url: currentUrl,
          sector: category,
          business_type: data.businessType,
          opening_hours: data.openingHours,
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
          }${lead.phone ? ` · ${lead.phone}` : ''}`,
        )

        if (results.length >= limit) break
      } catch (err) {
        // Singolo listing fallito — continua col prossimo
        const msg = err instanceof Error ? err.message.slice(0, 60) : 'errore'
        log(`[${category}] listing #${idx} skip (${msg})`)
      }
    }

    log(`[${category}] ✅ Completata: ${results.length} lead senza sito`)
    return results
  } finally {
    await browser.close()
  }
}

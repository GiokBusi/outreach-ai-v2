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

export async function scrapeGoogleMaps(
  category: string,
  city: string,
  limit: number,
  onProgress?: (msg: string) => void,
  includeWithWebsite = false,
): Promise<ScrapedLead[]> {
  const log = (m: string) => onProgress?.(m)
  log(`[${category}] Avvio browser…`)

  // Import dinamico: non viene risolto da Next.js a build-time
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
    log(`[${category}] Cerco a "${city}"…`)
    await page.goto(`https://www.google.com/maps/search/${query}`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2500)

    // Consent (IT)
    for (const label of ['Accetta tutto', 'Accetta tutti', 'Accept all']) {
      const btn = page.locator(`button:has-text("${label}")`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(1500)
        break
      }
    }

    const results: ScrapedLead[] = []
    const sidebar = page.locator('[role="feed"]').first()

    // Scroll molto di più per caricare ~80-120 risultati
    log(`[${category}] Carico elenco…`)
    for (let i = 0; i < 15; i++) {
      await sidebar.evaluate((el) => (el.scrollTop = el.scrollHeight)).catch(() => {})
      await page.waitForTimeout(900)
    }

    const listings = await page.locator('[role="feed"] a[href*="/maps/place/"]').all()
    log(`[${category}] ${listings.length} listing trovati, apro uno per uno…`)

    // Molto più paziente: prova fino a 10× il limit o tutta la lista
    const maxTries = Math.min(listings.length, Math.max(limit * 10, 50))

    for (let idx = 0; idx < maxTries; idx++) {
      const listing = listings[idx]
      try {
        await listing.click()
        await page.waitForTimeout(1200)

        // Raccogli tutti i dati dal pannello detail
        const data = await page.evaluate(() => {
          const pickText = (sel: string): string | null => {
            const el = document.querySelector(sel) as HTMLElement | null
            return el?.innerText?.trim() || null
          }
          const pickAttr = (sel: string, attr: string): string | null => {
            const el = document.querySelector(sel) as HTMLElement | null
            return el?.getAttribute(attr) || null
          }

          const name = pickText('h1')

          // Website: l'elemento [data-item-id="authority"] è il link al sito
          const websiteEl = document.querySelector(
            'a[data-item-id="authority"]',
          ) as HTMLAnchorElement | null
          const websiteUrl = websiteEl?.href || null

          const phone = pickText('[data-item-id^="phone"]')
          const address = pickText('[data-item-id="address"]')

          // Tipo attività: compare sotto h1, è un button o span vicino al rating
          // Proviamo più selettori
          let businessType: string | null = null
          const typeBtn = document.querySelector(
            'button[jsaction*="category"]',
          ) as HTMLElement | null
          if (typeBtn) businessType = typeBtn.innerText.trim()

          // Orari: elemento [data-item-id="oh"] oppure bloccare con "Aperto"/"Chiuso"
          const hoursEl = document.querySelector(
            '[data-item-id*="oh"]',
          ) as HTMLElement | null
          const opening = hoursEl?.innerText?.trim().replace(/\s+/g, ' ') || null

          // Rating + review count: pattern "4,3 (128)" in testo del pannello
          const bodyText = document.body.innerText || ''
          const m = bodyText.match(/(\d[,.]\d)\s*\((\d+[.,]?\d*)\)/)
          let rating: number | null = null
          let reviewCount: number | null = null
          if (m) {
            rating = parseFloat(m[1].replace(',', '.'))
            reviewCount = parseInt(m[2].replace(/[.,]/g, ''), 10)
            if (isNaN(rating)) rating = null
            if (isNaN(reviewCount)) reviewCount = null
          }

          return {
            name,
            websiteUrl,
            phone,
            address,
            businessType,
            opening,
            rating,
            reviewCount,
          }
        })

        // Filtro sito
        if (!includeWithWebsite && data.websiteUrl) {
          continue
        }

        if (data.name) {
          const lead: ScrapedLead = {
            company_name: data.name.trim(),
            phone: data.phone,
            address: data.address,
            google_maps_url: page.url(),
            sector: category,
            business_type: data.businessType,
            opening_hours: data.opening,
            website_url: data.websiteUrl,
            rating: data.rating,
            review_count: data.reviewCount,
            popularity_score: computeScore(data.rating, data.reviewCount),
          }
          results.push(lead)
          log(
            `[${category}] + ${lead.company_name} ${
              lead.rating != null
                ? `(★${lead.rating.toFixed(1)} · ${lead.review_count} rec · score ${lead.popularity_score})`
                : ''
            }`,
          )
        }

        if (results.length >= limit) break
      } catch {
        // ignora fallimenti singoli
      }
    }

    log(`[${category}] Completato: ${results.length} lead senza sito`)
    return results
  } finally {
    await browser.close()
  }
}

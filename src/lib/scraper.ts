export type ScrapedLead = {
  company_name: string
  phone: string | null
  email: string | null
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

function placeKey(url: string): string {
  const m = url.match(/\/maps\/place\/([^/@]+)/)
  return m ? m[1] : url
}

export type ScraperCallbacks = {
  onLog?: (msg: string) => void
  onLead?: (lead: ScrapedLead) => void
}

async function acceptCookies(page: import('playwright').Page) {
  if (page.url().includes('consent.google')) {
    for (const label of ['Accetta tutto', 'Accetta tutti', 'Accept all', 'Rifiuta tutto', 'Reject all']) {
      const btn = page.locator(`button:has-text("${label}")`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {})
        break
      }
    }
    await page.waitForURL(/google\.com\/maps/, { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)
  }
  for (const label of ['Accetta tutto', 'Accetta tutti', 'Accept all', 'Rifiuta tutto', 'Reject all']) {
    const btn = page.locator(`button:has-text("${label}")`).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(2000)
      break
    }
  }
}

export async function scrapeGoogleMaps(
  category: string,
  city: string,
  limit: number,
  callbacks: ScraperCallbacks = {},
): Promise<ScrapedLead[]> {
  const log = (m: string) => callbacks.onLog?.(m)
  log(`[${category}] Avvio browser…`)

  const playwrightModule = 'playwright'
  const { chromium } = (await import(/* webpackIgnore: true */ playwrightModule)) as typeof import('playwright')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    locale: 'it-IT',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    // FASE 1: Apri la ricerca e raccogli tutti i link dei posti
    const query = encodeURIComponent(`${category} ${city}`)
    log(`[${category}] Cerco "${category}" a "${city}"…`)
    await page.goto(`https://www.google.com/maps/search/${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    }).catch(() => {})
    await page.waitForTimeout(2000)

    await acceptCookies(page)

    await page
      .locator('[role="feed"]')
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {})

    log(`[${category}] Scorro la lista…`)
    const sidebar = page.locator('[role="feed"]').first()
    for (let i = 0; i < 15; i++) {
      await sidebar.evaluate((el) => (el.scrollTop = el.scrollHeight)).catch(() => {})
      await page.waitForTimeout(700)
    }

    // Raccogli tutti gli href
    const hrefs = await page.evaluate(() => {
      const links = document.querySelectorAll('[role="feed"] a[href*="/maps/place/"]')
      return Array.from(links)
        .map((a) => a.getAttribute('href'))
        .filter(Boolean) as string[]
    })

    log(`[${category}] ${hrefs.length} posti trovati, analizzo uno per uno…`)

    if (hrefs.length === 0) {
      log(`[${category}] Nessun risultato trovato`)
      return []
    }

    // FASE 2: Visita ogni posto direttamente per estrarre i dati
    const results: ScrapedLead[] = []
    const seenKeys = new Set<string>()
    const maxTries = Math.min(hrefs.length, Math.max(limit * 6, 40))

    for (let idx = 0; idx < maxTries; idx++) {
      if (results.length >= limit) break

      const href = hrefs[idx]
      const key = placeKey(href)
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      try {
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})

        // Aspetta che l'h1 (nome posto) appaia
        await page.locator('h1').first().waitFor({ timeout: 5000 }).catch(() => {})
        // Aspetta che i data-item-id si carichino
        await page
          .locator('[data-item-id]')
          .first()
          .waitFor({ timeout: 5000 })
          .catch(() => {})
        await page.waitForTimeout(1000)

        // Espandi gli orari settimanali se presenti
        const showHoursBtn = page.locator('[aria-label="Mostra orari di apertura settimanali"]').first()
        if (await showHoursBtn.isVisible().catch(() => false)) {
          await showHoursBtn.click().catch(() => {})
          await page.waitForTimeout(1200)
        }

        // Estrai tutti i dati dalla pagina del posto
        const data = await page.evaluate(() => {
          let name: string | null = null
          let phone: string | null = null
          let email: string | null = null
          let address: string | null = null
          let websiteUrl: string | null = null
          let openingHours: string | null = null
          let businessType: string | null = null
          let rating: number | null = null
          let reviewCount: number | null = null

          // Nome
          const h1 = document.querySelector('h1')
          name = h1?.textContent?.trim() || null

          // Data-item-id: contatti
          const items = Array.from(document.querySelectorAll('[data-item-id]'))
          for (const item of items) {
            const id = item.getAttribute('data-item-id') || ''
            const el = item as HTMLElement
            const lbl = (el.getAttribute('aria-label') || '').trim()
            const text = (el.innerText || '').replace(/\s+/g, ' ').trim()

            if (id.startsWith('phone:tel:')) {
              phone = id.replace(/^phone:tel:/, '').trim() || null
              if (!phone) phone = lbl.replace(/^Telefono:\s*/i, '').trim() || text || null
            } else if (id === 'address' || id.startsWith('address')) {
              address = lbl.replace(/^Indirizzo:\s*/i, '').replace(/^Address:\s*/i, '').trim() || text || null
            } else if (id === 'authority') {
              const anchor = el.tagName === 'A' ? el : el.querySelector('a')
              const href = (anchor as HTMLAnchorElement | null)?.href || null
              if (href && !href.includes('google.com')) {
                websiteUrl = href
              } else if (text && /\.\w{2,}/.test(text) && !text.includes('google')) {
                websiteUrl = text
              }
            }
          }

          // Fallback telefono
          if (!phone) {
            const telLink = document.querySelector('a[href^="tel:"]') as HTMLAnchorElement | null
            if (telLink) phone = telLink.href.replace(/^tel:/, '').trim()
          }

          // Email
          const mailtoLink = document.querySelector('a[href^="mailto:"]') as HTMLAnchorElement | null
          if (mailtoLink) {
            email = mailtoLink.href.replace(/^mailto:/, '').split('?')[0].trim()
          }
          if (!email) {
            const bodyText = document.body.innerText || ''
            const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
            if (emailMatch && !emailMatch[0].includes('google') && !emailMatch[0].includes('gstatic')) {
              email = emailMatch[0]
            }
          }

          // Sito web fallback
          if (!websiteUrl) {
            const selectors = ['a[aria-label*="sito" i]', 'a[aria-label*="website" i]', 'a[data-tooltip*="sito" i]']
            for (const sel of selectors) {
              try {
                const el = document.querySelector(sel) as HTMLAnchorElement | null
                if (el?.href && !el.href.includes('google.com')) { websiteUrl = el.href; break }
              } catch {}
            }
          }

          // Rating e recensioni da aria-label: "X,Y stelle NNN recensioni"
          const allLabeled = Array.from(document.querySelectorAll('[aria-label]'))
          for (const el of allLabeled) {
            const lbl = el.getAttribute('aria-label') || ''
            if (rating == null) {
              const m = lbl.match(/(\d[,.]\d)\s*stell/i) || lbl.match(/(\d[,.]\d)\s*star/i)
              if (m) rating = parseFloat(m[1].replace(',', '.'))
            }
            if (reviewCount == null) {
              const m = lbl.match(/(\d[\d.]*)\s*recension/i) || lbl.match(/(\d[\d,]*)\s*review/i)
              if (m) {
                const n = parseInt(m[1].replace(/[.,]/g, ''), 10)
                if (!isNaN(n) && n > 0) reviewCount = n
              }
            }
            if (rating != null && reviewCount != null) break
          }

          // Fallback: testo visibile con pattern "(NNN)"
          if (reviewCount == null) {
            const body = document.body.innerText || ''
            const parens = body.match(/\((\d[\d.]*)\)/)
            if (parens) {
              const n = parseInt(parens[1].replace(/\./g, ''), 10)
              if (!isNaN(n) && n > 0 && n < 1000000) reviewCount = n
            }
          }

          // Orari settimanali
          const days = ['lunedì','martedì','mercoledì','giovedì','venerdì','sabato','domenica']
          const hoursList: string[] = []
          const allLabeledEls = Array.from(document.querySelectorAll('[aria-label]'))
          for (const el of allLabeledEls) {
            const lbl = el.getAttribute('aria-label') || ''
            const lower = lbl.toLowerCase()
            for (const day of days) {
              if (lower.startsWith(day)) {
                hoursList.push(lbl.replace(/, Copia orario di apertura/i, '').trim())
                break
              }
            }
          }
          if (hoursList.length > 0) {
            openingHours = hoursList.join(' | ')
          }

          // Tipo attivita
          const typeBtn = document.querySelector('button[jsaction*="category"]') as HTMLElement | null
          if (typeBtn) businessType = typeBtn.innerText?.trim() || null
          if (!businessType) {
            const catEl = document.querySelector('[jsaction*="category"]') as HTMLElement | null
            if (catEl) businessType = catEl.innerText?.trim() || null
          }

          return { name, phone, email, address, websiteUrl, openingHours, businessType, rating, reviewCount }
        })

        if (!data.name) continue

        // SCARTA chi ha il sito
        if (data.websiteUrl) {
          log(`[${category}] ✗ ${data.name} — ha sito web, scartato`)
          continue
        }

        const lead: ScrapedLead = {
          company_name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          google_maps_url: page.url(),
          sector: category,
          business_type: data.businessType,
          opening_hours: data.openingHours,
          website_url: null,
          rating: data.rating,
          review_count: data.reviewCount,
          popularity_score: computeScore(data.rating, data.reviewCount),
        }
        results.push(lead)
        callbacks.onLead?.(lead)

        const info = [
          lead.rating != null ? `★${lead.rating.toFixed(1)} (${lead.review_count ?? '?'})` : null,
          lead.phone ? `Tel: ${lead.phone}` : null,
          lead.email ? `Email: ${lead.email}` : null,
          lead.address ? lead.address.slice(0, 40) : null,
        ].filter(Boolean).join(' · ')

        log(`[${category}] ✓ ${lead.company_name}${info ? ` — ${info}` : ''}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 60) : 'errore'
        log(`[${category}] #${idx} skip (${msg})`)
      }
    }

    log(`[${category}] Completato: ${results.length} lead senza sito`)
    return results
  } finally {
    await browser.close()
  }
}

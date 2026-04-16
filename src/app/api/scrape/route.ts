import { NextRequest } from 'next/server'
import { scrapeGoogleMaps } from '@/lib/scraper'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { categories, city, limit, campaignId } = await req.json()

  const catList: string[] = Array.isArray(categories)
    ? categories
    : typeof categories === 'string'
      ? [categories]
      : []

  if (catList.length === 0 || !city || !campaignId) {
    return new Response(JSON.stringify({ error: 'Parametri mancanti' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const supabase = createAdminClient()

        // Carica google_maps_url già presenti (tra tutte le campagne) per dedup globale
        const { data: existing } = await supabase
          .from('leads')
          .select('google_maps_url')
        const existingKeys = new Set<string>(
          (existing || [])
            .map((r) => r.google_maps_url)
            .filter(Boolean)
            .map((u: string) => {
              const m = u.match(/\/maps\/place\/([^/@]+)/)
              return m ? m[1] : u
            }),
        )

        send({
          type: 'log',
          message: `Inizio: ${catList.length} categorie a ${city} · ${existingKeys.size} lead già noti (saranno saltati)`,
        })

        let totalSaved = 0

        for (const category of catList) {
          send({ type: 'category-start', category })
          try {
            const leads = await scrapeGoogleMaps(
              category,
              city,
              Number(limit) || 15,
              {
                onLog: (msg) => send({ type: 'log', message: msg }),
                onLead: (lead) => {
                  // Dedupe globale contro quelli già nel DB
                  const m = lead.google_maps_url.match(/\/maps\/place\/([^/@]+)/)
                  const key = m ? m[1] : lead.google_maps_url
                  if (existingKeys.has(key)) {
                    send({
                      type: 'log',
                      message: `[${category}] ↷ ${lead.company_name} già nel DB, skip`,
                    })
                    return
                  }
                  existingKeys.add(key)

                  // Salva subito (fire-and-forget) per non bloccare lo scraper
                  void supabase
                    .from('leads')
                    .insert({
                      campaign_id: campaignId,
                      company_name: lead.company_name,
                      sector: lead.sector,
                      phone: lead.phone,
                      email: lead.email,
                      google_maps_url: lead.google_maps_url,
                      address: lead.address,
                      opening_hours: lead.opening_hours,
                      business_type: lead.business_type,
                      website_url: lead.website_url,
                      rating: lead.rating,
                      review_count: lead.review_count,
                      popularity_score: lead.popularity_score,
                    })
                    .then(({ error }) => {
                      if (error) {
                        send({
                          type: 'log',
                          message: `[${category}] Errore DB insert: ${error.message}`,
                        })
                      }
                    })

                  totalSaved++

                  // Invia evento live al client così la UI aggiorna in tempo reale
                  send({
                    type: 'lead',
                    lead: {
                      company_name: lead.company_name,
                      sector: lead.sector,
                      business_type: lead.business_type,
                      address: lead.address,
                      phone: lead.phone,
                      email: lead.email,
                      rating: lead.rating,
                      review_count: lead.review_count,
                      popularity_score: lead.popularity_score,
                    },
                    total: totalSaved,
                  })
                },
              },
            )

            send({
              type: 'category-done',
              category,
              found: leads.length,
              total: totalSaved,
            })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto'
            send({ type: 'log', message: `[${category}] ❌ Errore: ${message}` })
          }
        }

        // Aggiorna conteggio campagna
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
        await supabase
          .from('campaigns')
          .update({ leads_found: count || 0 })
          .eq('id', campaignId)

        send({ type: 'done', found: totalSaved })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore'
        send({ type: 'error', message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  })
}

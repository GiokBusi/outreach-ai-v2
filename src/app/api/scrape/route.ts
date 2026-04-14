import { NextRequest } from 'next/server'
import { scrapeGoogleMaps } from '@/lib/scraper'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { categories, city, limit, campaignId } = await req.json()

  // Accetta sia un array (multi) sia una singola `category` per retrocompatibilità
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
        send({
          type: 'log',
          message: `Avvio scraping: ${catList.length} categorie a ${city}`,
        })

        const supabase = createAdminClient()
        let totalFound = 0

        for (const category of catList) {
          try {
            const leads = await scrapeGoogleMaps(
              category,
              city,
              Number(limit) || 20,
              (msg) => send({ type: 'log', message: msg }),
            )

            const rows = leads.map((l) => ({
              campaign_id: campaignId,
              company_name: l.company_name,
              sector: l.sector,
              phone: l.phone,
              google_maps_url: l.google_maps_url,
              address: l.address,
              opening_hours: l.opening_hours,
              business_type: l.business_type,
              website_url: l.website_url,
              rating: l.rating,
              review_count: l.review_count,
              popularity_score: l.popularity_score,
            }))

            if (rows.length > 0) {
              const { error: insertErr } = await supabase.from('leads').insert(rows)
              if (insertErr) {
                send({
                  type: 'log',
                  message: `[${category}] Errore insert: ${insertErr.message}`,
                })
              }
            }

            totalFound += leads.length
            send({
              type: 'category-done',
              category,
              found: leads.length,
              total: totalFound,
            })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto'
            send({ type: 'log', message: `[${category}] Errore: ${message}` })
          }
        }

        await supabase
          .from('campaigns')
          .update({ leads_found: totalFound })
          .eq('id', campaignId)

        send({ type: 'done', found: totalFound })
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore sconosciuto'
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

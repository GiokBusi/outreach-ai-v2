import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { personalizeEmail } from '@/lib/gemini'
import { sendEmail } from '@/lib/brevo'

export const runtime = 'nodejs'
export const maxDuration = 300

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const { campaignId, templateId, dailyLimit } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const supabase = createAdminClient()

        // Load template
        const tplQuery = templateId
          ? supabase.from('email_templates').select('*').eq('id', templateId).single()
          : supabase.from('email_templates').select('*').eq('is_default', true).single()
        const { data: template, error: tplErr } = await tplQuery
        if (tplErr || !template) {
          send({ type: 'error', message: 'Template non trovato' })
          controller.close()
          return
        }

        // Load leads to send
        const limit = Number(dailyLimit) || 50
        const { data: leads, error: leadsErr } = await supabase
          .from('leads')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('status', 'found')
          .not('email', 'is', null)
          .limit(limit)

        if (leadsErr) {
          send({ type: 'error', message: leadsErr.message })
          controller.close()
          return
        }

        send({ type: 'log', message: `Trovati ${leads?.length || 0} lead da contattare` })

        let sent = 0
        for (const lead of leads || []) {
          if (!lead.email) continue
          try {
            send({ type: 'log', message: `Personalizzo per ${lead.company_name}…` })
            const personalized = await personalizeEmail(
              template.body,
              lead.company_name,
              lead.sector || '',
            )

            await sendEmail({
              to: lead.email,
              subject: template.subject.replaceAll('[Nome]', lead.company_name),
              body: personalized,
              trackingId: lead.tracking_id,
            })

            await supabase
              .from('leads')
              .update({ status: 'sent', email_sent_at: new Date().toISOString() })
              .eq('id', lead.id)

            sent++
            send({ type: 'sent', company: lead.company_name, sent })

            // Throttle: ~5/sec for Brevo, ~15/min for Gemini free tier
            await sleep(4500)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore invio'
            send({ type: 'log', message: `Errore ${lead.company_name}: ${message}` })
          }
        }

        await supabase
          .from('campaigns')
          .update({ emails_sent: sent })
          .eq('id', campaignId)

        send({ type: 'done', sent })
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

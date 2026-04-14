import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/leads/[id]'>,
) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const update: Record<string, unknown> = {}
    if ('status' in body) update.status = body.status
    if ('notes' in body) update.notes = body.notes ?? ''
    if ('email' in body) update.email = body.email || null
    if ('whatsapp' in body) update.whatsapp = body.whatsapp || null

    const supabase = createAdminClient()
    const { error } = await supabase.from('leads').update(update).eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

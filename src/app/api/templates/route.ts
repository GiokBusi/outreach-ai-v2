import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_default', true)
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ template: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, subject, body: content } = await req.json()
    if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('email_templates')
      .update({ subject, body: content })
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const showArchived = searchParams.get('archived') === 'all'

    const supabase = createAdminClient()
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (!showArchived) {
      query = query.eq('archived', false)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ leads: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids mancanti' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (action === 'delete') {
      const { error } = await supabase.from('leads').delete().in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, deleted: ids.length })
    }

    if (action === 'archive') {
      const { error } = await supabase.from('leads').update({ archived: true }).in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, archived: ids.length })
    }

    if (action === 'unarchive') {
      const { error } = await supabase.from('leads').update({ archived: false }).in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, unarchived: ids.length })
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

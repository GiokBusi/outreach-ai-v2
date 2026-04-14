import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ campaigns: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: body.name,
        category: body.category,
        city: body.city,
        daily_limit: body.daily_limit || 50,
      })
      .select()
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ campaign: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

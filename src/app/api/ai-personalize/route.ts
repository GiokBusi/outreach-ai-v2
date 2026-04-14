import { NextRequest, NextResponse } from 'next/server'
import { personalizeEmail } from '@/lib/gemini'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { template, companyName, sector } = await req.json()
    if (!template || !companyName) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }
    const result = await personalizeEmail(template, companyName, sector || '')
    return NextResponse.json({ text: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

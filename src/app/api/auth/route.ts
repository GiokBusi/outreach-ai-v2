import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Password errata' }, { status: 401 })
  }
  const store = await cookies()
  store.set('auth_token', String(password), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete('auth_token')
  return NextResponse.json({ ok: true })
}

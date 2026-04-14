import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const auth = request.cookies.get('auth_token')
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!auth || auth.value !== process.env.DASHBOARD_PASSWORD) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }

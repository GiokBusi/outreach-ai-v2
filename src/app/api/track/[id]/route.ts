import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/track/[id]'>) {
  const { id } = await ctx.params

  try {
    const supabase = createAdminClient()
    await supabase
      .from('leads')
      .update({ status: 'opened', email_opened_at: new Date().toISOString() })
      .eq('tracking_id', id)
      .eq('status', 'sent')
  } catch {
    // swallow — we still serve the pixel
  }

  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  )

  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Length': String(pixel.length),
    },
  })
}

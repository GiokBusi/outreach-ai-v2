import { createAdminClient } from '@/lib/supabase'
import StatsCard from '@/components/StatsCard'
import LeadTable from '@/components/LeadTable'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  let leadsFound = 0
  let withPhone = 0
  let withEmail = 0
  let emailsSent = 0
  let opened = 0
  let replied = 0
  let interested = 0
  let recent: Awaited<ReturnType<typeof fetchRecent>> = []

  try {
    const supabase = createAdminClient()
    const [foundRes, phoneRes, emailRes, sentRes, openedRes, repliedRes, intRes] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('phone', 'is', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('email_sent_at', 'is', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('email_opened_at', 'is', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'interested'),
    ])
    leadsFound = foundRes.count || 0
    withPhone = phoneRes.count || 0
    withEmail = emailRes.count || 0
    emailsSent = sentRes.count || 0
    opened = openedRes.count || 0
    replied = repliedRes.count || 0
    interested = intRes.count || 0
    recent = await fetchRecent()
  } catch {}

  const openRate = emailsSent > 0 ? Math.round((opened / emailsSent) * 100) : 0
  const replyRate = emailsSent > 0 ? Math.round((replied / emailsSent) * 100) : 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Panoramica</h1>
        <p className="text-xs text-slate-500 mt-1">
          Dashboard generale
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Lead trovati" value={leadsFound} hint={`${withPhone} con tel · ${withEmail} con email`} />
        <StatsCard label="Email inviate" value={emailsSent} />
        <StatsCard label="Open rate" value={`${openRate}%`} hint={`${opened} aperture`} />
        <StatsCard label="Reply rate" value={`${replyRate}%`} hint={`${replied} risposte · ${interested} interessati`} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Ultimi lead</h2>
        <LeadTable leads={recent} />
      </div>
    </div>
  )
}

async function fetchRecent() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

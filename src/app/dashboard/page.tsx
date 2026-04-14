import { createAdminClient } from '@/lib/supabase'
import StatsCard from '@/components/StatsCard'
import LeadTable from '@/components/LeadTable'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  let leadsFound = 0
  let emailsSent = 0
  let opened = 0
  let interested = 0
  let recent: Awaited<ReturnType<typeof fetchRecent>> = []

  try {
    const supabase = createAdminClient()
    const [foundRes, sentRes, openedRes, intRes] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'opened'),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'interested'),
    ])
    leadsFound = foundRes.count || 0
    emailsSent = sentRes.count || 0
    opened = openedRes.count || 0
    interested = intRes.count || 0
    recent = await fetchRecent()
  } catch {
    // env not configured yet
  }

  const openRate = emailsSent > 0 ? Math.round((opened / emailsSent) * 100) : 0

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Panoramica</h1>
        <p className="text-sm text-slate-400 mt-1">Stato generale delle campagne</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Lead trovati" value={leadsFound} />
        <StatsCard label="Mail inviate" value={emailsSent} />
        <StatsCard label="Open rate" value={`${openRate}%`} hint={`${opened} aperture`} />
        <StatsCard label="Interessati" value={interested} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Ultimi 10 lead</h2>
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

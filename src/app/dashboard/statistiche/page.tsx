'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatsCard from '@/components/StatsCard'
import { type Lead } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  found: '#64748b',
  sent: '#3b82f6',
  opened: '#f59e0b',
  replied: '#a855f7',
  interested: '#10b981',
  not_interested: '#ef4444',
}

export default function StatistichePage() {
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setLeads((data.leads as Lead[]) || [])
    } catch {}
  }

  const sent = leads.filter((l) => l.email_sent_at).length
  const opened = leads.filter((l) => l.email_opened_at).length
  const replied = leads.filter((l) => l.email_replied_at).length
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0

  // Open by day (last 14 days)
  const days: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days[key] = 0
  }
  for (const l of leads) {
    if (!l.email_opened_at) continue
    const key = l.email_opened_at.slice(0, 10)
    if (key in days) days[key]++
  }
  const opensData = Object.entries(days).map(([date, count]) => ({
    date: date.slice(5),
    aperture: count,
  }))

  // Status distribution
  const statusCounts: Record<string, number> = {}
  for (const l of leads) {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
  }
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Statistiche</h1>
        <p className="text-sm text-slate-400 mt-1">Performance delle campagne</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard label="Mail inviate" value={sent} />
        <StatsCard label="Open rate" value={`${openRate}%`} hint={`${opened} aperture`} />
        <StatsCard label="Reply rate" value={`${replyRate}%`} hint={`${replied} risposte`} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Aperture ultimi 14 giorni
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={opensData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="aperture" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Distribuzione stati lead
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || '#64748b'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

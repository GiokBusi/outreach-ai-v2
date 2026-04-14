'use client'

import type { Lead } from '@/lib/supabase'

const STATUS_STYLES: Record<string, string> = {
  found: 'bg-slate-700 text-slate-200',
  sent: 'bg-blue-600/30 text-blue-300 border border-blue-500/40',
  opened: 'bg-amber-600/30 text-amber-300 border border-amber-500/40',
  replied: 'bg-purple-600/30 text-purple-300 border border-purple-500/40',
  interested: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40',
  not_interested: 'bg-red-600/30 text-red-300 border border-red-500/40',
}

const STATUS_LABEL: Record<string, string> = {
  found: 'Trovato',
  sent: 'Inviato',
  opened: 'Aperto',
  replied: 'Risposto',
  interested: 'Interessato',
  not_interested: 'Non interessato',
}

function tempOf(score: number | null): {
  label: string
  color: string
  pct: number
} {
  if (score == null) return { label: '—', color: 'bg-slate-700', pct: 0 }
  const pct = Math.min(100, Math.round((score / 100) * 100))
  if (score >= 60) return { label: 'Hot', color: 'bg-rose-500', pct }
  if (score >= 25) return { label: 'Warm', color: 'bg-amber-500', pct }
  return { label: 'Cold', color: 'bg-sky-500', pct }
}

export default function LeadTable({
  leads,
  onSelect,
}: {
  leads: Lead[]
  onSelect?: (l: Lead) => void
}) {
  const sorted = [...leads].sort((a, b) => {
    const sa = a.popularity_score ?? -1
    const sb = b.popularity_score ?? -1
    return sb - sa
  })

  if (!sorted.length) {
    return (
      <div className="text-slate-500 text-sm p-6 text-center bg-slate-900/50 border border-slate-800 rounded-2xl">
        Nessun lead da mostrare.
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-950/50 text-slate-400 text-[10px] uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">Attività</th>
            <th className="text-left px-4 py-3 w-48">Popolarità</th>
            <th className="text-left px-4 py-3">Indirizzo</th>
            <th className="text-left px-4 py-3">Contatti</th>
            <th className="text-left px-4 py-3 w-32">Stato</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sorted.map((l) => {
            const t = tempOf(l.popularity_score)
            return (
              <tr
                key={l.id}
                onClick={() => onSelect?.(l)}
                className="hover:bg-slate-800/40 cursor-pointer transition"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{l.company_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {l.business_type || l.sector}
                    {l.rating != null && l.review_count != null && (
                      <>
                        {' · '}★ {l.rating.toFixed(1)} · {l.review_count} rec.
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide text-white ${t.color}`}
                    >
                      {t.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`${t.color} h-full transition-all`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono w-8 text-right">
                      {l.popularity_score ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs">
                  <div className="truncate">{l.address || '—'}</div>
                  {l.opening_hours && (
                    <div className="truncate text-slate-600 mt-0.5">
                      {l.opening_hours}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {l.phone && <div>📞 {l.phone}</div>}
                  {l.email && <div>✉ {l.email}</div>}
                  {!l.phone && !l.email && '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-xs ${
                      STATUS_STYLES[l.status] || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {STATUS_LABEL[l.status] || l.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

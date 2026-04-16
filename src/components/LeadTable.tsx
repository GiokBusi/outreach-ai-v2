'use client'

import type { Lead } from '@/lib/supabase'

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  found: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
  sent: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  opened: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  replied: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  interested: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  not_interested: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
}

const STATUS_LABEL: Record<string, string> = {
  found: 'Nuovo',
  sent: 'Contattato',
  opened: 'Aperto',
  replied: 'Risposto',
  interested: 'Interessato',
  not_interested: 'Non interessa',
}

const QUICK_ACTIONS: { status: string; label: string; color: string }[] = [
  { status: 'replied', label: 'Risposto', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { status: 'interested', label: 'Interessato', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { status: 'not_interested', label: 'Non interessa', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
]

export default function LeadTable({
  leads,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onQuickStatus,
}: {
  leads: Lead[]
  onSelect?: (l: Lead) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
  onQuickStatus?: (id: string, status: string) => void
}) {
  const sorted = [...leads].sort((a, b) => (b.popularity_score ?? -1) - (a.popularity_score ?? -1))
  const allSelected = sorted.length > 0 && selectedIds?.size === sorted.length

  if (!sorted.length) {
    return (
      <div className="text-slate-500 text-sm p-12 text-center bg-[#0a0b12] border border-[#1a1c2e] rounded-2xl">
        Nessun lead da mostrare.
      </div>
    )
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {onToggleAll && (
          <label className="flex items-center gap-2 px-1 py-1 text-xs text-slate-500">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="accent-indigo-500 w-3.5 h-3.5" />
            Seleziona tutti
          </label>
        )}
        {sorted.map((l) => {
          const st = STATUS_STYLES[l.status] || STATUS_STYLES.found
          const checked = selectedIds?.has(l.id) ?? false
          const showQuick = onQuickStatus && (l.status === 'sent' || l.status === 'opened')
          return (
            <div
              key={l.id}
              className={`bg-[#0a0b12] border border-[#1a1c2e] rounded-xl p-3.5 transition ${checked ? 'border-indigo-500/30 bg-indigo-950/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                {onToggleSelect && (
                  <input type="checkbox" checked={checked} onChange={() => onToggleSelect(l.id)} className="accent-indigo-500 w-3.5 h-3.5 mt-1 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div onClick={() => onSelect?.(l)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-100 text-sm truncate">{l.company_name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 ${st.bg} ${st.text}`}>
                        <span className={`w-1 h-1 rounded-full ${st.dot}`} />
                        {STATUS_LABEL[l.status] || l.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{l.business_type || l.sector}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs">
                      {l.phone && <span className="text-slate-300">{l.phone}</span>}
                      {l.email && <span className="text-slate-400 truncate max-w-[180px]">{l.email}</span>}
                      {l.rating != null && (
                        <span className="text-amber-400 font-medium">★ {l.rating.toFixed(1)} ({l.review_count})</span>
                      )}
                    </div>
                    {l.address && <div className="text-[11px] text-slate-600 mt-1 truncate">{l.address}</div>}
                  </div>
                  {showQuick && (
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-[#16182a]">
                      {QUICK_ACTIONS.map((a) => (
                        <button
                          key={a.status}
                          onClick={() => onQuickStatus(l.id, a.status)}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition hover:opacity-80 ${a.color}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-[#0a0b12] border border-[#1a1c2e] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1c2e]">
              {onToggleAll && (
                <th className="w-12 px-4 py-3.5">
                  <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer rounded" />
                </th>
              )}
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attivita</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contatti</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Localita</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">Recensioni</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">Stato</th>
              {onQuickStatus && <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-48">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const checked = selectedIds?.has(l.id) ?? false
              const st = STATUS_STYLES[l.status] || STATUS_STYLES.found
              const showQuick = onQuickStatus && (l.status === 'sent' || l.status === 'opened')
              return (
                <tr key={l.id} className={`border-b border-[#12131e] transition-colors ${checked ? 'bg-indigo-950/20' : 'hover:bg-[#0e0f18]'}`}>
                  {onToggleSelect && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => onToggleSelect(l.id)} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer rounded" />
                    </td>
                  )}
                  <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                    <div className="font-medium text-slate-100 leading-tight">{l.company_name}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{l.business_type || l.sector || '—'}</div>
                  </td>
                  <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                    {(l.phone || l.email) ? (
                      <div className="space-y-0.5">
                        {l.phone && <div className="flex items-center gap-1.5 text-xs text-slate-300"><span className="text-slate-500">Tel</span>{l.phone}</div>}
                        {l.email && <div className="flex items-center gap-1.5 text-xs text-slate-300"><span className="text-slate-500">Email</span><span className="truncate max-w-[180px]">{l.email}</span></div>}
                      </div>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3.5 cursor-pointer hidden lg:table-cell" onClick={() => onSelect?.(l)}>
                    <div className="text-xs text-slate-400 max-w-[220px] truncate">{l.address || '—'}</div>
                  </td>
                  <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                    {l.rating != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 text-xs font-semibold">{l.rating.toFixed(1)}</span>
                        <span className="text-[11px] text-slate-500">({l.review_count ?? 0})</span>
                      </div>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {STATUS_LABEL[l.status] || l.status}
                    </span>
                  </td>
                  {onQuickStatus && (
                    <td className="px-4 py-3.5">
                      {showQuick ? (
                        <div className="flex gap-1">
                          {QUICK_ACTIONS.map((a) => (
                            <button
                              key={a.status}
                              onClick={() => onQuickStatus(l.id, a.status)}
                              className={`px-2 py-1 rounded-md text-[10px] font-medium border transition hover:opacity-80 ${a.color}`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-700">—</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

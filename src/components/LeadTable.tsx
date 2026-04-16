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

export default function LeadTable({
  leads,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  leads: Lead[]
  onSelect?: (l: Lead) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
}) {
  const sorted = [...leads].sort((a, b) => {
    const sa = a.popularity_score ?? -1
    const sb = b.popularity_score ?? -1
    return sb - sa
  })

  const allSelected = sorted.length > 0 && selectedIds?.size === sorted.length

  if (!sorted.length) {
    return (
      <div className="text-slate-500 text-sm p-12 text-center bg-[#0a0b12] border border-[#1a1c2e] rounded-2xl">
        Nessun lead da mostrare.
      </div>
    )
  }

  return (
    <div className="bg-[#0a0b12] border border-[#1a1c2e] rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1a1c2e]">
            {onToggleAll && (
              <th className="w-12 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer rounded"
                />
              </th>
            )}
            <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attivita</th>
            <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contatti</th>
            <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Localita</th>
            <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">Recensioni</th>
            <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-32">Stato</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((l) => {
            const checked = selectedIds?.has(l.id) ?? false
            const st = STATUS_STYLES[l.status] || STATUS_STYLES.found
            const hasContacts = l.phone || l.email
            return (
              <tr
                key={l.id}
                className={`border-b border-[#12131e] transition-colors ${checked ? 'bg-indigo-950/20' : 'hover:bg-[#0e0f18]'}`}
              >
                {onToggleSelect && (
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect(l.id)}
                      className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer rounded"
                    />
                  </td>
                )}
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                  <div className="font-medium text-slate-100 leading-tight">{l.company_name}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {l.business_type || l.sector || '—'}
                  </div>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                  {hasContacts ? (
                    <div className="space-y-0.5">
                      {l.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="text-slate-500">Tel</span>
                          {l.phone}
                        </div>
                      )}
                      {l.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="text-slate-500">Email</span>
                          <span className="truncate max-w-[180px]">{l.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                  <div className="text-xs text-slate-400 max-w-[220px] truncate">{l.address || '—'}</div>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                  {l.rating != null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs font-semibold">{l.rating.toFixed(1)}</span>
                      <span className="text-[11px] text-slate-500">({l.review_count ?? 0})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onSelect?.(l)}>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
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

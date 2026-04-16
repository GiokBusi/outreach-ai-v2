'use client'

import { useEffect, useMemo, useState } from 'react'
import LeadTable from '@/components/LeadTable'
import { type Lead } from '@/lib/supabase'

const STATUSES = ['', 'found', 'sent', 'opened', 'replied', 'interested', 'not_interested']
const STATUS_LABEL: Record<string, string> = {
  '': 'Tutti',
  found: 'Nuovo',
  sent: 'Contattato',
  opened: 'Aperto',
  replied: 'Risposto',
  interested: 'Interessato',
  not_interested: 'Non interessa',
}

export default function LeadPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [debug, setDebug] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [editStatus, setEditStatus] = useState<Lead['status']>('found')
  const [editNotes, setEditNotes] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailLog, setEmailLog] = useState<string[]>([])

  useEffect(() => {
    void load()
  }, [showArchived])

  async function load() {
    try {
      const res = await fetch(
        showArchived ? '/api/leads?archived=all' : '/api/leads',
        { cache: 'no-store' },
      )
      const data = await res.json()
      if (!res.ok) {
        setDebug(`Errore: ${data.error || res.status}`)
        return
      }
      setDebug('')
      setLeads((data.leads as Lead[]) || [])
    } catch (err) {
      setDebug(`Exception: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false
      if (
        search &&
        !`${l.company_name} ${l.email || ''} ${l.sector || ''} ${l.address || ''} ${l.phone || ''} ${l.business_type || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [leads, search, statusFilter])

  const stats = useMemo(() => {
    const withEmail = leads.filter((l) => l.email).length
    const withPhone = leads.filter((l) => l.phone).length
    const contacted = leads.filter((l) => l.status !== 'found').length
    return { total: leads.length, withEmail, withPhone, contacted }
  }, [leads])

  function openLead(l: Lead) {
    setSelected(l)
    setEditStatus(l.status)
    setEditNotes(l.notes || '')
    setEditEmail(l.email || '')
  }

  async function saveLead() {
    if (!selected) return
    try {
      await fetch(`/api/leads/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
          email: editEmail.trim() || null,
        }),
      })
      setSelected(null)
      await load()
    } catch {}
  }

  async function archiveLead(lead: Lead, archived = true) {
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      setSelected(null)
      await load()
    } catch {}
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)))
    }
  }

  async function bulkAction(action: 'archive' | 'delete' | 'unarchive') {
    if (selectedIds.size === 0) return
    const label = action === 'delete' ? 'eliminare' : action === 'archive' ? 'scartare' : 'ripristinare'
    if (!confirm(`Vuoi ${label} ${selectedIds.size} lead selezionati?`)) return
    setBulkLoading(true)
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
      })
      setSelectedIds(new Set())
      await load()
    } catch {} finally {
      setBulkLoading(false)
    }
  }

  async function sendEmailToLeads(ids: string[]) {
    const leadsToSend = leads.filter((l) => ids.includes(l.id))
    const withEmail = leadsToSend.filter((l) => l.email)
    if (withEmail.length === 0) {
      alert('Nessuno dei lead selezionati ha un indirizzo email.')
      return
    }
    if (!confirm(`Inviare email a ${withEmail.length} lead?`)) return

    setSendingEmail(true)
    setEmailLog([])
    try {
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ids }),
      })
      if (!res.body) throw new Error('Nessuna risposta')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line)
            if (evt.type === 'log') setEmailLog((l) => [...l, evt.message])
            else if (evt.type === 'sent') setEmailLog((l) => [...l, `✓ Email inviata a ${evt.company}`])
            else if (evt.type === 'done') setEmailLog((l) => [...l, `Completato: ${evt.sent} email inviate`])
            else if (evt.type === 'error') setEmailLog((l) => [...l, `Errore: ${evt.message}`])
          } catch {}
        }
      }
      setSelectedIds(new Set())
      await load()
    } catch (err) {
      setEmailLog((l) => [...l, `Errore: ${err instanceof Error ? err.message : 'sconosciuto'}`])
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Lead</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} totali · {stats.withPhone} con telefono · {stats.withEmail} con email · {stats.contacted} contattati
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${
            showArchived
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-transparent border-[#1a1c2e] text-slate-500 hover:text-slate-300 hover:border-slate-600'
          }`}
        >
          {showArchived ? 'Mostra solo attivi' : 'Includi scartati'}
        </button>
      </div>

      {debug && (
        <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs text-amber-300 font-mono">
          {debug}
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[280px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca nome, telefono, email, indirizzo..."
            className="input w-full pl-9"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-1 bg-[#0a0b12] border border-[#1a1c2e] rounded-lg p-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Barra azioni bulk */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
          <span className="text-sm text-indigo-300 font-medium">
            {selectedIds.size} selezionati
          </span>
          <div className="flex-1" />
          <button
            onClick={() => sendEmailToLeads(Array.from(selectedIds))}
            disabled={bulkLoading || sendingEmail}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {sendingEmail ? 'Invio in corso…' : 'Invia email ai selezionati'}
          </button>
          {!showArchived && (
            <button
              onClick={() => bulkAction('archive')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
            >
              Scarta selezionati
            </button>
          )}
          {showArchived && (
            <button
              onClick={() => bulkAction('unarchive')}
              disabled={bulkLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              Ripristina selezionati
            </button>
          )}
          <button
            onClick={() => bulkAction('delete')}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
          >
            Elimina definitivamente
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 transition"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Tabella */}
      <LeadTable
        leads={filtered}
        onSelect={openLead}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
      />

      {/* Log invio email */}
      {emailLog.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Log invio email</h3>
            {!sendingEmail && (
              <button onClick={() => setEmailLog([])} className="text-xs text-slate-600 hover:text-slate-400">
                Chiudi
              </button>
            )}
          </div>
          <div className="font-mono text-xs text-emerald-400 max-h-40 overflow-auto space-y-0.5">
            {emailLog.map((l, i) => <div key={i}>{l}</div>)}
            {sendingEmail && <div className="text-indigo-400 animate-pulse">Invio in corso…</div>}
          </div>
        </div>
      )}

      {/* Modale dettaglio lead */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#0c0d15] border border-[#1a1c2e] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modale */}
            <div className="p-6 border-b border-[#1a1c2e]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-100 leading-tight">
                    {selected.company_name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selected.business_type || selected.sector}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-600 hover:text-slate-300 transition p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selected.rating != null && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-amber-400 font-semibold text-sm">
                    ★ {selected.rating.toFixed(1)}
                  </span>
                  <span className="text-slate-500 text-sm">
                    ({selected.review_count ?? 0} recensioni)
                  </span>
                </div>
              )}
            </div>

            {/* Informazioni contatto */}
            <div className="p-6 space-y-3 border-b border-[#1a1c2e]">
              <h3 className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold mb-3">
                Informazioni
              </h3>
              <div className="grid gap-2.5">
                <InfoRow label="Indirizzo" value={selected.address} />
                <InfoRow
                  label="Telefono"
                  value={selected.phone}
                  href={selected.phone ? `tel:${selected.phone.replace(/\s/g, '')}` : undefined}
                />
                <InfoRow
                  label="Email"
                  value={selected.email || editEmail || undefined}
                  href={selected.email ? `mailto:${selected.email}` : undefined}
                />
                {selected.opening_hours && selected.opening_hours.includes('|') ? (
                  <WeeklyHours raw={selected.opening_hours} />
                ) : (
                  <InfoRow label="Orari" value={selected.opening_hours} />
                )}
                <InfoRow
                  label="Sito"
                  value={selected.website_url ? selected.website_url : 'Nessuno'}
                  href={selected.website_url || undefined}
                  highlight={!selected.website_url}
                />
              </div>

              {selected.google_maps_url && (
                <a
                  href={selected.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full bg-[#12131c] hover:bg-[#1a1c28] border border-[#1e202d] text-slate-300 font-medium py-2.5 rounded-xl text-sm transition"
                >
                  Apri su Google Maps
                </a>
              )}
            </div>

            {/* Gestione */}
            <div className="p-6 space-y-4">
              <h3 className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                Gestione
              </h3>

              <label className="block">
                <span className="text-xs text-slate-500">Email contatto</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="info@esempio.it"
                  className="input mt-1 w-full"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">Stato</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Lead['status'])}
                  className="input mt-1 w-full"
                >
                  {STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">Note</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="input mt-1 w-full resize-none"
                  placeholder="Appunti sul lead..."
                />
              </label>
            </div>

            {/* Azioni */}
            <div className="p-6 pt-0 flex gap-2">
              <button onClick={saveLead} className="flex-1 btn-primary">
                Salva
              </button>
              {(selected.email || editEmail) && (
                <button
                  onClick={async () => {
                    if (editEmail && editEmail !== selected.email) await saveLead()
                    await sendEmailToLeads([selected.id])
                    setSelected(null)
                  }}
                  disabled={sendingEmail}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                  {sendingEmail ? 'Invio…' : 'Invia email'}
                </button>
              )}
              {selected.archived ? (
                <button
                  onClick={() => archiveLead(selected, false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  Ripristina
                </button>
              ) : (
                <button
                  onClick={() => archiveLead(selected, true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
                >
                  Scarta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  href,
  highlight,
}: {
  label: string
  value?: string | null
  href?: string
  highlight?: boolean
}) {
  const display = value || '—'
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-slate-600 w-20 shrink-0 text-xs pt-0.5">{label}</span>
      {href ? (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 transition truncate"
        >
          {display}
        </a>
      ) : (
        <span className={highlight ? 'text-emerald-400 text-xs font-medium' : 'text-slate-300 truncate'}>
          {display}
        </span>
      )}
    </div>
  )
}

const DAY_ORDER = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']
const DAY_SHORT: Record<string, string> = {
  lunedì: 'Lun', martedì: 'Mar', mercoledì: 'Mer', giovedì: 'Gio',
  venerdì: 'Ven', sabato: 'Sab', domenica: 'Dom',
}

function WeeklyHours({ raw }: { raw: string }) {
  const entries = raw.split(' | ').map((entry) => {
    const parts = entry.split(',')
    const day = parts[0].trim().toLowerCase()
    const hours = parts.slice(1).join(', ').trim()
    return { day, hours }
  })

  const sorted = DAY_ORDER.map((day) => {
    const found = entries.find((e) => e.day === day)
    return { day, hours: found?.hours || '—' }
  })

  const today = DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  return (
    <div className="mt-1">
      <span className="text-slate-600 text-xs">Orari</span>
      <div className="mt-1.5 bg-[#08090e] border border-[#16182a] rounded-lg overflow-hidden">
        {sorted.map(({ day, hours }) => {
          const isToday = day === today
          const isClosed = hours.toLowerCase() === 'chiuso'
          return (
            <div
              key={day}
              className={`flex items-center justify-between px-3 py-1.5 text-xs border-b border-[#12131e] last:border-0 ${isToday ? 'bg-indigo-950/20' : ''}`}
            >
              <span className={`w-10 font-medium ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
                {DAY_SHORT[day]}
              </span>
              <span className={isClosed ? 'text-rose-400/70' : 'text-slate-300'}>
                {hours.replace(/Dalle /g, '').replace(/ alle /g, '–') || '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

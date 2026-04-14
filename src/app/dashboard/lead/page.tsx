'use client'

import { useEffect, useMemo, useState } from 'react'
import LeadTable from '@/components/LeadTable'
import { type Lead } from '@/lib/supabase'

const STATUSES = ['', 'found', 'sent', 'opened', 'replied', 'interested', 'not_interested']

export default function LeadPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [debug, setDebug] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [editStatus, setEditStatus] = useState<Lead['status']>('found')
  const [editNotes, setEditNotes] = useState('')
  const [editEmail, setEditEmail] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' })
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
        !`${l.company_name} ${l.email || ''} ${l.sector || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [leads, search, statusFilter])

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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead CRM</h1>
        <p className="text-sm text-slate-400 mt-1">{filtered.length} lead</p>
        {debug && (
          <div className="mt-3 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-xs text-amber-200 font-mono">
            DEBUG: {debug}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca azienda, email, settore…"
          className="input flex-1 min-w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s : 'Tutti gli stati'}
            </option>
          ))}
        </select>
      </div>

      <LeadTable leads={filtered} onSelect={openLead} />

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">{selected.company_name}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {selected.business_type || selected.sector || '—'}
            </p>

            {selected.rating != null && selected.review_count != null && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-amber-400">★ {selected.rating.toFixed(1)}</span>
                <span className="text-slate-400">{selected.review_count} recensioni</span>
                {selected.popularity_score != null && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                    score {selected.popularity_score}
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Settore cercato" value={selected.sector} />
              <Row label="Tipo" value={selected.business_type} />
              <Row label="Indirizzo" value={selected.address} />
              <Row label="Orari" value={selected.opening_hours} />
              <Row label="Telefono" value={selected.phone} />
              <Row label="Email (attuale)" value={selected.email} />
              <Row label="WhatsApp" value={selected.whatsapp} />
              <Row
                label="Sito web"
                value={
                  selected.website_url ? (
                    <a
                      href={selected.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 underline truncate block max-w-xs"
                    >
                      {selected.website_url}
                    </a>
                  ) : (
                    'nessuno'
                  )
                }
              />
              {selected.google_maps_url && (
                <Row
                  label="Google Maps"
                  value={
                    <a
                      href={selected.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 underline"
                    >
                      apri scheda
                    </a>
                  }
                />
              )}
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-xs uppercase text-slate-400">
                  Email (per test invio — metti la tua)
                </span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="tua@gmail.com"
                  className="input mt-1 w-full"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase text-slate-400">Stato</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Lead['status'])}
                  className="input mt-1 w-full"
                >
                  {STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-slate-400">Note</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="input mt-1 w-full"
                />
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={saveLead}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Salva
              </button>
              <button
                onClick={() => setSelected(null)}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value || '—'}</span>
    </div>
  )
}

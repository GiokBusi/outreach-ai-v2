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
        !`${l.company_name} ${l.email || ''} ${l.sector || ''} ${l.address || ''}`
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
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead CRM</h1>
          <p className="text-sm text-slate-400 mt-1">
            {filtered.length} lead · click su una riga per dettagli e contatti
          </p>
        </div>
      </div>

      {debug && (
        <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded-xl text-xs text-amber-200 font-mono">
          DEBUG: {debug}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, email, indirizzo, settore…"
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-7 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight">
                  {selected.company_name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {selected.business_type || selected.sector}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-200 text-xl leading-none"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>

            {selected.rating != null && selected.review_count != null && (
              <div className="mt-4 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  ★ {selected.rating.toFixed(1)}
                </span>
                <span className="text-slate-400">
                  {selected.review_count} recensioni
                </span>
                {selected.popularity_score != null && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium">
                    score {selected.popularity_score}
                  </span>
                )}
              </div>
            )}

            {/* Azione: apri in Google Maps */}
            {selected.google_maps_url && (
              <a
                href={selected.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition"
              >
                🗺 Apri su Google Maps
              </a>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm">
              <InfoRow
                icon="📍"
                label="Indirizzo"
                value={selected.address || '—'}
              />
              <InfoRow
                icon="📞"
                label="Telefono"
                value={
                  selected.phone ? (
                    <a
                      href={`tel:${selected.phone.replace(/\s/g, '')}`}
                      className="text-indigo-400 hover:underline"
                    >
                      {selected.phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow icon="🕒" label="Orari" value={selected.opening_hours || '—'} />
              <InfoRow
                icon="🌐"
                label="Sito web"
                value={
                  selected.website_url ? (
                    <a
                      href={selected.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline truncate block max-w-xs"
                    >
                      {selected.website_url}
                    </a>
                  ) : (
                    <span className="text-emerald-400">nessuno (ottimo target)</span>
                  )
                }
              />
              <InfoRow icon="🏷" label="Settore ricerca" value={selected.sector || '—'} />
            </div>

            <div className="mt-6 space-y-4 border-t border-slate-800 pt-5">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Gestione
              </h3>

              <label className="block">
                <span className="text-xs font-medium text-slate-400">
                  Email (aggiungi per poter inviare)
                </span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="info@esempio.it"
                  className="input mt-1 w-full"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-400">Stato</span>
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
                <span className="text-xs font-medium text-slate-400">Note</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="input mt-1 w-full resize-none"
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveLead}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Salva modifiche
              </button>
              <button
                onClick={() => setSelected(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition"
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-slate-900/60 border border-slate-800/60 rounded-xl">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </div>
        <div className="text-slate-200 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  )
}

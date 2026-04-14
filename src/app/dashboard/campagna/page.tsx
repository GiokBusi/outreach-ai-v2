'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient, type Campaign } from '@/lib/supabase'
import { CATEGORY_GROUPS } from '@/lib/categories'

export default function CampagnaPage() {
  const [name, setName] = useState('')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [customCat, setCustomCat] = useState('')
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(15)
  const [dailyLimit, setDailyLimit] = useState(50)
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    void loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      setCampaigns((data as Campaign[]) || [])
    } catch {}
  }

  function appendLog(msg: string) {
    setLogs((l) => [...l.slice(-300), msg])
  }

  function toggleCategory(cat: string) {
    setSelectedCats((cur) =>
      cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat],
    )
  }

  function selectAll() {
    const all = CATEGORY_GROUPS.flatMap((g) => g.items)
    setSelectedCats(all)
  }

  function clearAll() {
    setSelectedCats([])
  }

  async function startScraping(e: React.FormEvent) {
    e.preventDefault()
    const customItems = customCat
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const categories = [...selectedCats, ...customItems]

    if (categories.length === 0) {
      appendLog('⚠️ Seleziona almeno una categoria')
      return
    }

    setRunning(true)
    setLogs([])
    try {
      const supabase = createBrowserClient()
      const { data: created, error } = await supabase
        .from('campaigns')
        .insert({
          name: name || `${city} · ${categories.length} cat.`,
          category: categories.join(', '),
          city,
          daily_limit: dailyLimit,
        })
        .select()
        .single()
      if (error || !created) throw new Error(error?.message || 'Errore creazione campagna')
      setCurrentCampaign(created as Campaign)
      appendLog(`📁 Campagna creata: ${(created as Campaign).name}`)

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          city,
          limit,
          campaignId: (created as Campaign).id,
        }),
      })

      if (!res.body) throw new Error('Nessuna risposta dal server')
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
            if (evt.type === 'log') appendLog(evt.message)
            else if (evt.type === 'category-done')
              appendLog(`✅ [${evt.category}] ${evt.found} lead — totale ${evt.total}`)
            else if (evt.type === 'done') appendLog(`🏁 Completato: ${evt.found} lead totali`)
            else if (evt.type === 'error') appendLog(`❌ ${evt.message}`)
          } catch {
            appendLog(line)
          }
        }
      }
      await loadCampaigns()
    } catch (err) {
      appendLog(`❌ ${err instanceof Error ? err.message : 'Errore'}`)
    } finally {
      setRunning(false)
    }
  }

  async function sendEmails() {
    if (!currentCampaign) return
    setRunning(true)
    try {
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: currentCampaign.id,
          dailyLimit,
        }),
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
            if (evt.type === 'log') appendLog(evt.message)
            else if (evt.type === 'sent') appendLog(`📧 ${evt.company} (${evt.sent})`)
            else if (evt.type === 'done') appendLog(`✅ Inviate ${evt.sent} email`)
            else if (evt.type === 'error') appendLog(`❌ ${evt.message}`)
          } catch {}
        }
      }
      await loadCampaigns()
    } catch (err) {
      appendLog(`❌ ${err instanceof Error ? err.message : 'Errore'}`)
    } finally {
      setRunning(false)
    }
  }

  const totalSelected = selectedCats.length

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Nuova campagna</h1>
        <p className="text-sm text-slate-400 mt-1">
          Scraping multi-categoria da Google Maps · solo aziende senza sito
        </p>
      </div>

      <form
        onSubmit={startScraping}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nome campagna">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="(opzionale)"
              className="input w-full"
            />
          </Field>
          <Field label="Città">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="es. Milano"
              required
              className="input w-full"
            />
          </Field>
          <Field label="Lead per categoria">
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={1}
              max={100}
              className="input w-full"
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Categorie ({totalSelected} selezionate)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Seleziona tutto
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Svuota
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-xs uppercase text-slate-500 mb-2">{group.label}</div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((cat) => {
                    const on = selectedCats.includes(cat)
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`text-sm px-3 py-1.5 rounded-full border transition ${
                          on
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs text-slate-500">
              Aggiungi categorie personalizzate (separa con virgola)
            </label>
            <input
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
              placeholder="es. Tatuatore, Scuola di lingue"
              className="input w-full mt-1"
            />
          </div>
        </div>

        <Field label="Mail al giorno (per invio)">
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            min={1}
            max={300}
            className="input w-40"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={running}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {running ? 'In corso…' : '🚀 Avvia scraping'}
          </button>
          <button
            type="button"
            onClick={sendEmails}
            disabled={running || !currentCampaign}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            ✉️ Invia email
          </button>
        </div>
      </form>

      {logs.length > 0 && (
        <div className="bg-black border border-slate-800 rounded-2xl p-4 font-mono text-xs text-emerald-300 max-h-80 overflow-auto">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Campagne</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Categorie</th>
                <th className="text-left px-4 py-3">Città</th>
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Inviate</th>
                <th className="text-left px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center px-4 py-6 text-slate-500">
                    Nessuna campagna ancora.
                  </td>
                </tr>
              )}
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {c.category}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.city}</td>
                  <td className="px-4 py-3">{c.leads_found}</td>
                  <td className="px-4 py-3">{c.emails_sent}</td>
                  <td className="px-4 py-3 text-slate-400">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

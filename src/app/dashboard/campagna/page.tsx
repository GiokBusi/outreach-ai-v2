'use client'

import { useEffect, useState } from 'react'
import { type Campaign } from '@/lib/supabase'
import { CATEGORY_GROUPS } from '@/lib/categories'

type LiveLead = {
  company_name: string
  sector: string
  business_type: string | null
  address: string | null
  phone: string | null
  email: string | null
  rating: number | null
  review_count: number | null
  popularity_score: number | null
}

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
  const [liveLeads, setLiveLeads] = useState<LiveLead[]>([])
  const [currentCategory, setCurrentCategory] = useState<string>('')
  const [catsDone, setCatsDone] = useState(0)
  const [totalCats, setTotalCats] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [skipped, setSkipped] = useState(0)

  useEffect(() => {
    void loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/campaigns', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setCampaigns((data.campaigns as Campaign[]) || [])
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
    setLiveLeads([])
    setCurrentCategory('')
    setCatsDone(0)
    setTotalCats(categories.length)
    setStartTime(Date.now())
    setSkipped(0)
    try {
      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${city} · ${categories.length} cat.`,
          category: categories.join(', '),
          city,
          daily_limit: dailyLimit,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok || !createData.campaign) {
        throw new Error(createData.error || 'Errore creazione campagna')
      }
      const created = createData.campaign as Campaign
      setCurrentCampaign(created)
      appendLog(`📁 Campagna creata: ${created.name}`)

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          city,
          limit,
          campaignId: created.id,
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
            if (evt.type === 'log') {
              appendLog(evt.message)
              if (typeof evt.message === 'string' && evt.message.includes('ha sito web, scartato')) {
                setSkipped((s) => s + 1)
              }
            } else if (evt.type === 'category-start') {
              setCurrentCategory(evt.category)
              appendLog(`▶ Categoria: ${evt.category}`)
            } else if (evt.type === 'lead') {
              setLiveLeads((cur) => [evt.lead, ...cur])
            } else if (evt.type === 'category-done') {
              setCatsDone((c) => c + 1)
              appendLog(
                `✅ [${evt.category}] ${evt.found} lead — totale ${evt.total}`,
              )
            } else if (evt.type === 'done') {
              setCurrentCategory('')
              appendLog(`🏁 Completato: ${evt.found} lead totali`)
            } else if (evt.type === 'error') {
              appendLog(`❌ ${evt.message}`)
            }
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

  async function sendEmails(campId?: string) {
    const id = campId || currentCampaign?.id
    if (!id) return
    setRunning(true)
    try {
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: id,
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
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuova campagna</h1>
        <p className="text-sm text-slate-400 mt-1">
          Scraping multi-categoria da Google Maps · solo attività senza sito web
        </p>
      </div>

      <form onSubmit={startScraping} className="card p-7 space-y-6">
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
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                Seleziona tutto
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
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
                        className={`text-sm px-3.5 py-1.5 rounded-full border transition ${
                          on
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-indigo-500/60 hover:bg-slate-800/60'
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
          <button type="submit" disabled={running} className="btn-primary">
            {running ? 'In corso…' : '🚀 Avvia scraping'}
          </button>
          <button
            type="button"
            onClick={() => sendEmails()}
            disabled={running || !currentCampaign}
            className="btn-success"
          >
            ✉ Invia email
          </button>
        </div>
      </form>

      {(running || liveLeads.length > 0) && (
        <ProgressPanel
          running={running}
          currentCategory={currentCategory}
          liveLeads={liveLeads}
          catsDone={catsDone}
          totalCats={totalCats}
          startTime={startTime}
          skipped={skipped}
        />
      )}

      {logs.length > 0 && (
        <details className="bg-black border border-slate-800 rounded-2xl">
          <summary className="cursor-pointer px-5 py-3 text-xs text-slate-400 select-none">
            Log tecnico ({logs.length} righe)
          </summary>
          <div className="p-4 pt-0 font-mono text-xs text-emerald-300 max-h-80 overflow-auto">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </details>
      )}

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Campagne</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#16182a]">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Categorie</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Città</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Lead</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Inviate</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center px-4 py-6 text-slate-600">
                    Nessuna campagna ancora.
                  </td>
                </tr>
              )}
              {campaigns.map((c) => {
                const isSelected = currentCampaign?.id === c.id
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-[#12131e] transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/20' : 'hover:bg-[#0e0f18]'}`}
                    onClick={() => setCurrentCampaign(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        <span className="font-medium text-slate-200">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-xs">
                      {c.category}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.city}</td>
                    <td className="px-4 py-3 text-slate-300">{c.leads_found}</td>
                    <td className="px-4 py-3 text-slate-300">{c.emails_sent}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setCurrentCampaign(c); void sendEmails(c.id) }}
                        disabled={running}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        Invia email
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProgressPanel({
  running,
  currentCategory,
  liveLeads,
  catsDone,
  totalCats,
  startTime,
  skipped,
}: {
  running: boolean
  currentCategory: string
  liveLeads: LiveLead[]
  catsDone: number
  totalCats: number
  startTime: number
  skipped: number
}) {
  const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000))
  const pct = totalCats > 0 ? Math.round((catsDone / totalCats) * 100) : 0
  const perCat = catsDone > 0 ? elapsed / catsDone : 0
  const remaining = catsDone > 0 ? Math.round(perCat * (totalCats - catsDone)) : 0

  function fmtTime(s: number) {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const withPhone = liveLeads.filter((l) => l.phone).length
  const withEmail = liveLeads.filter((l) => l.email).length

  return (
    <div className="card overflow-hidden">
      {/* Header con barra progresso */}
      <div className="p-5 border-b border-[#16182a]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {running && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            <h2 className="font-semibold text-slate-100 text-sm">
              {running ? 'Scansione in corso' : 'Scansione completata'}
            </h2>
            {currentCategory && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-600/15 text-indigo-400 font-medium">
                {currentCategory}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {fmtTime(elapsed)}
          </span>
        </div>

        {/* Barra progresso */}
        <div className="relative h-2 bg-[#12131e] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: running ? `${Math.max(pct, catsDone > 0 ? pct : 5)}%` : '100%' }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500">
          <span>{catsDone}/{totalCats} categorie</span>
          <div className="flex gap-4">
            <span className="text-slate-300">{liveLeads.length} lead salvati</span>
            {skipped > 0 && <span className="text-rose-400">{skipped} con sito (scartati)</span>}
            {withPhone > 0 && <span className="text-emerald-400">{withPhone} con telefono</span>}
            {withEmail > 0 && <span className="text-blue-400">{withEmail} con email</span>}
          </div>
          {running && remaining > 0 && (
            <span>~{fmtTime(remaining)} rimanenti</span>
          )}
        </div>
      </div>

      {/* Tabella lead trovati */}
      {liveLeads.length > 0 && (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#08090e]">
              <tr className="border-b border-[#16182a]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Attivita</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Contatti</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Localita</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider w-24">Recensioni</th>
              </tr>
            </thead>
            <tbody>
              {liveLeads.map((l, i) => (
                <tr key={`${l.company_name}-${i}`} className="border-b border-[#12131e] animate-fade-in">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-200 text-[13px]">{l.company_name}</div>
                    <div className="text-[11px] text-slate-600">{l.business_type || l.sector}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {l.phone && <div className="text-slate-300">{l.phone}</div>}
                    {l.email && <div className="text-slate-400 truncate max-w-[160px]">{l.email}</div>}
                    {!l.phone && !l.email && <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">
                    {l.address || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.rating != null ? (
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 text-xs font-semibold">{l.rating.toFixed(1)}</span>
                        <span className="text-[11px] text-slate-600">({l.review_count ?? 0})</span>
                      </div>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

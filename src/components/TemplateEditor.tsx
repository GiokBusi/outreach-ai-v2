'use client'

import { useEffect, useState } from 'react'
import { type EmailTemplate } from '@/lib/supabase'

export default function TemplateEditor() {
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      const res = await fetch('/api/templates', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.template) {
        const t = data.template as EmailTemplate
        setTemplate(t)
        setSubject(t.subject)
        setBody(t.body)
      }
    } catch {}
  }

  async function save() {
    if (!template) return
    setLoading(true)
    try {
      await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, subject, body }),
      })
    } finally {
      setLoading(false)
    }
  }

  async function generatePreview() {
    setLoading(true)
    setPreview('')
    try {
      const res = await fetch('/api/ai-personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: body,
          companyName: 'Ristorante Da Mario',
          sector: 'ristorante',
        }),
      })
      const data = await res.json()
      setPreview(data.text || data.error || '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-xs uppercase text-slate-400">Oggetto</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-xs uppercase text-slate-400">
          Corpo email (usa [Nome] come variabile)
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="input mt-1 w-full font-mono text-sm"
        />
      </label>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          Salva template
        </button>
        <button
          onClick={generatePreview}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
        >
          ✨ Anteprima AI
        </button>
      </div>

      {preview && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs uppercase text-slate-400 mb-2">Anteprima personalizzata</p>
          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">
            {preview}
          </pre>
        </div>
      )}
    </div>
  )
}

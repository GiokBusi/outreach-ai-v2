'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('Password errata')
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm card p-8 shadow-2xl shadow-indigo-900/20"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
            O
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">OutreachAI</h1>
            <p className="text-xs text-slate-500">Accedi alla dashboard</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input w-full"
          autoFocus
          required
        />

        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}

        <button type="submit" disabled={loading} className="mt-6 w-full btn-primary">
          {loading ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </main>
  )
}

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
    <main className="flex-1 flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold mb-1">OutreachAI</h1>
        <p className="text-sm text-slate-400 mb-6">Accedi alla dashboard</p>

        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
          required
        />

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition"
        >
          {loading ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Panoramica', icon: '📊' },
  { href: '/dashboard/campagna', label: 'Nuova campagna', icon: '🚀' },
  { href: '/dashboard/lead', label: 'Lead CRM', icon: '👥' },
  { href: '/dashboard/template', label: 'Template AI', icon: '✉️' },
  { href: '/dashboard/statistiche', label: 'Statistiche', icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">OutreachAI</h1>
        <p className="text-xs text-slate-400 mt-1">SatoshiDev Agency</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active =
            it.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
        >
          ⏻ Esci
        </button>
      </div>
    </aside>
  )
}

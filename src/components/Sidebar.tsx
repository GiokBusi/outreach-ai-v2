'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Panoramica', icon: '◨' },
  { href: '/dashboard/campagna', label: 'Nuova campagna', icon: '⏵' },
  { href: '/dashboard/lead', label: 'Lead CRM', icon: '☷' },
  { href: '/dashboard/template', label: 'Template AI', icon: '✎' },
  { href: '/dashboard/statistiche', label: 'Statistiche', icon: '◰' },
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
    <aside className="w-64 bg-slate-950/40 backdrop-blur-md border-r border-slate-800/60 text-slate-100 flex flex-col sticky top-0 h-screen">
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            O
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">OutreachAI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              SatoshiDev Agency
            </p>
          </div>
        </div>
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
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <span
                className={`text-base ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}
              >
                {it.icon}
              </span>
              <span className="font-medium">{it.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800/60">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 transition"
        >
          ⏻ Esci
        </button>
      </div>
    </aside>
  )
}

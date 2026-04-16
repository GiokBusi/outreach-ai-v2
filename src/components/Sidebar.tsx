'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Panoramica', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/campagna', label: 'Campagne', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/dashboard/lead', label: 'Lead', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/dashboard/template', label: 'Template', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { href: '/dashboard/statistiche', label: 'Statistiche', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
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
    <aside className="w-56 bg-[#08090e] border-r border-[#16182a] flex flex-col sticky top-0 h-screen">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            O
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">OutreachAI</h1>
            <p className="text-[10px] text-slate-600">Lead generation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((it) => {
          const active =
            it.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${
                active
                  ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#0e0f18]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={it.icon} />
              </svg>
              {it.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[#16182a]">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-600 hover:text-slate-400 hover:bg-[#0e0f18] transition"
        >
          Esci
        </button>
      </div>
    </aside>
  )
}

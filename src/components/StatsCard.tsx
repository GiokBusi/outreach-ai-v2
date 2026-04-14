export default function StatsCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const accentColor = {
    indigo: 'from-indigo-500/20 to-indigo-500/0',
    emerald: 'from-emerald-500/20 to-emerald-500/0',
    amber: 'from-amber-500/20 to-amber-500/0',
    rose: 'from-rose-500/20 to-rose-500/0',
  }[accent || 'indigo']

  return (
    <div className="relative overflow-hidden card p-5">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentColor} pointer-events-none`}
      />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          {label}
        </p>
        <p className="text-3xl font-bold text-slate-50 mt-2 tracking-tight">{value}</p>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    </div>
  )
}

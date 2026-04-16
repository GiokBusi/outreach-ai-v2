export default function StatsCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-[11px] uppercase tracking-wider text-slate-600 font-medium">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-100 mt-1.5 tracking-tight">{value}</p>
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

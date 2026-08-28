import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  color,
  title,
  subtitle,
  action,
}: {
  eyebrow: string
  color: string
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div
          className="text-[11px] font-extrabold uppercase tracking-widest mb-1"
          style={{ color }}
        >
          {eyebrow}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

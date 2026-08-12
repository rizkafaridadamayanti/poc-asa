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
    <div className="page-header">
      <div className="page-header-card">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div>
            <div className="page-header-eyebrow" style={{ color }}>
              {eyebrow}
            </div>
            <h2 className="mb-0">{title}</h2>
            {subtitle && <p className="text-muted mb-0 mt-2 small">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="page-header-accent" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}

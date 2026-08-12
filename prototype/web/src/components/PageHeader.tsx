import type { ReactNode } from "react"

export function PageHeader({
  icon,
  color,
  title,
  subtitle,
  action,
}: {
  icon: string
  color: string
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="page-header d-flex align-items-start justify-content-between flex-wrap gap-3">
      <div className="d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
            color,
          }}
        >
          <i className={`bi ${icon} fs-4`} />
        </div>
        <div>
          <h2 className="mb-0">{title}</h2>
          {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

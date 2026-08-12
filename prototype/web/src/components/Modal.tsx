import type { MouseEvent, ReactNode } from "react"

export function Modal({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: "sm" | "lg"
}) {
  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <>
      <div className="modal-backdrop show" />
      <div className="modal d-block" tabIndex={-1} role="dialog" onClick={onClose}>
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable${size ? ` modal-${size}` : ""}`}
          role="document"
          onClick={stop}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  )
}

import type { MouseEvent, ReactNode } from "react"
import { X } from "lucide-react"

export function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs animate-in" onClick={onClose}>
      <div
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={stop}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

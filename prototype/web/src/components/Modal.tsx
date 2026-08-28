import type { MouseEvent, ReactNode } from "react"
import { X } from "lucide-react"

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
  const maxWidth = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] relative`}
        onClick={stop}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

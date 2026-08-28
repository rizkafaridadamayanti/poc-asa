import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from "lucide-react"

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  type = "danger",
  busy,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: "danger" | "warning" | "info" | "success"
  busy?: boolean
}) {
  if (!isOpen) return null

  let icon = <AlertCircle className="w-6 h-6 text-rose-600" />
  let iconBg = "bg-rose-50 border-rose-200"
  let buttonStyle = "bg-rose-600 hover:bg-rose-700 text-white"

  if (type === "warning") {
    icon = <AlertTriangle className="w-6 h-6 text-amber-600" />
    iconBg = "bg-amber-50 border-amber-200"
    buttonStyle = "bg-amber-600 hover:bg-amber-700 text-white"
  } else if (type === "info") {
    icon = <Info className="w-6 h-6 text-blue-600" />
    iconBg = "bg-blue-50 border-blue-200"
    buttonStyle = "bg-blue-600 hover:bg-blue-700 text-white"
  } else if (type === "success") {
    icon = <CheckCircle className="w-6 h-6 text-emerald-600" />
    iconBg = "bg-emerald-50 border-emerald-200"
    buttonStyle = "bg-emerald-600 hover:bg-emerald-700 text-white"
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 border ${iconBg}`}>{icon}</div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-60 ${buttonStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

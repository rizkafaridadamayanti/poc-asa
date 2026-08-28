import { useState } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type Toast = { id: number; message: string; type: "info" | "success" | "error" }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return { toasts, add, remove }
}

const TOAST_STYLE: Record<Toast["type"], { icon: JSX.Element; border: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    border: "border-emerald-200 shadow-emerald-500/10",
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    border: "border-rose-200 shadow-rose-500/10",
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    border: "border-blue-200 shadow-blue-500/10",
  },
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: number) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
      {toasts.map((t) => {
        const style = TOAST_STYLE[t.type]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border bg-white shadow-lg animate-in ${style.border}`}
          >
            <div className="mt-0.5">{style.icon}</div>
            <p className="flex-1 min-w-0 text-sm font-medium text-slate-800">{t.message}</p>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

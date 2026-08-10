import { useState } from "react"

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

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: number) => void
}) {
  return (
    <div className="toast-stack d-flex flex-column gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

const BG_CLASS: Record<Toast["type"], string> = {
  success: "text-bg-success",
  error: "text-bg-danger",
  info: "text-bg-primary",
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  return (
    <div className={`toast show ${BG_CLASS[toast.type]}`} role="alert">
      <div className="d-flex">
        <div className="toast-body">{toast.message}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          onClick={() => onRemove(toast.id)}
          aria-label="Close"
        />
      </div>
    </div>
  )
}

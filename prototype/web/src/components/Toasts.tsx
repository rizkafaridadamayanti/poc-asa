import { useEffect, useState } from "react"

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
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        zIndex: 100,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const enter = setTimeout(() => setShow(true), 10)
    return () => clearTimeout(enter)
  }, [])

  const bg =
    toast.type === "success" ? "#dcfce7" : toast.type === "error" ? "#fee2e2" : "#eff6ff"
  const color =
    toast.type === "success" ? "#166534" : toast.type === "error" ? "#991b1b" : "#1e40af"

  return (
    <div
      style={{
        background: bg,
        color,
        padding: "0.75rem 1rem",
        borderRadius: "0.4rem",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        minWidth: "240px",
        maxWidth: "360px",
        opacity: show ? 1 : 0,
        transform: show ? "translateX(0)" : "translateX(1rem)",
        transition: "opacity 200ms, transform 200ms",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        ×
      </button>
    </div>
  )
}

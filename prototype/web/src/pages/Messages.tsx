import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { api, type Message } from "../api.js"

export function Messages() {
  const { lastInbound } = useOutletContext<{ lastInbound: Record<string, unknown> | null }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.messages(limit, newOffset)
      setMessages(res.messages)
      setTotal(res.total)
      setOffset(res.offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
  }, [])

  useEffect(() => {
    if (!lastInbound) return
    const msg = lastInbound as unknown as Message
    setMessages((prev) => {
      if (prev.some((m) => m.messageId === msg.messageId)) return prev
      return [msg, ...prev]
    })
    setTotal((t) => t + 1)
  }, [lastInbound])

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString()

  return (
    <div>
      <h2 className="mb-4">Messages</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading messages…</p>}
      {!loading && messages.length === 0 && <p className="text-muted fst-italic">No messages yet.</p>}
      {messages.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle bg-white">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>Chat</th>
                  <th>Text</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m._id}>
                    <td className="text-nowrap">{formatDate(m.timestamp)}</td>
                    <td>{m.fromJid}</td>
                    <td>
                      <span className={`badge ${m.isGroup ? "text-bg-primary" : "text-bg-secondary"}`}>
                        {m.isGroup ? "Group" : "DM"}
                      </span>
                    </td>
                    <td>{m.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex align-items-center gap-3 mt-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset === 0 || loading}
              onClick={() => load(Math.max(offset - limit, 0))}
            >
              <i className="bi bi-chevron-left" /> Previous
            </button>
            <span className="text-muted small">
              {offset + 1}–{Math.min(offset + messages.length, total)} of {total}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset + messages.length >= total || loading}
              onClick={() => load(offset + limit)}
            >
              Next <i className="bi bi-chevron-right" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

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
      <h2 className="page-title">Messages</h2>
      {error && <div className="alert error">{error}</div>}
      {loading && <p className="loading">Loading messages…</p>}
      {!loading && messages.length === 0 && <p className="empty">No messages yet.</p>}
      {messages.length > 0 && (
        <>
          <table>
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
                  <td>{formatDate(m.timestamp)}</td>
                  <td>{m.fromJid}</td>
                  <td>{m.isGroup ? "Group" : "DM"}</td>
                  <td>{m.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              className="btn btn-secondary"
              disabled={offset === 0 || loading}
              onClick={() => load(Math.max(offset - limit, 0))}
            >
              Previous
            </button>
            <span>
              {offset + 1}–{Math.min(offset + messages.length, total)} of {total}
            </span>
            <button
              className="btn btn-secondary"
              disabled={offset + messages.length >= total || loading}
              onClick={() => load(offset + limit)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

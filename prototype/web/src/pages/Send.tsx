import { useState } from "react"
import { api } from "../api.js"

export function Send() {
  const [to, setTo] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.send(to, text)
      setResult(res)
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="page-title">Send WhatsApp Message</h2>
      {error && <div className="alert error">{error}</div>}
      {result && (
        <div className="alert success">Sent. Message ID: {result.id}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="to">To (phone number or JID)</label>
          <input
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="628xxxxxxxxxx"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="text">Message</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            required
          />
        </div>
        <button className="btn" disabled={loading}>
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  )
}

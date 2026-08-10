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
      <h2 className="mb-4">Send WhatsApp Message</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {result && (
        <div className="alert alert-success">
          Sent. Message ID: <code>{result.id}</code>
        </div>
      )}
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "480px" }}>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="to" className="form-label">
              To (phone number or JID)
            </label>
            <input
              id="to"
              className="form-control"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="628xxxxxxxxxx"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="text" className="form-label">
              Message
            </label>
            <textarea
              id="text"
              className="form-control"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message…"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            <i className="bi bi-send me-1" />
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  )
}

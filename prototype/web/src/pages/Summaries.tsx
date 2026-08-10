import { useEffect, useState } from "react"
import { api, type Summary } from "../api.js"

export function Summaries() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.summaries(limit, newOffset)
      setSummaries(res.summaries)
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

  return (
    <div>
      <h2 className="page-title">Summaries</h2>
      {error && <div className="alert error">{error}</div>}
      {loading && <p className="loading">Loading summaries…</p>}
      {!loading && summaries.length === 0 && <p className="empty">No summaries yet.</p>}
      {summaries.map((s) => (
        <div key={s._id} className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <strong>{new Date(s.periodStart).toLocaleDateString()} — {new Date(s.periodEnd).toLocaleDateString()}</strong>
            <span className="muted">{s.sourceMessageIds.length} messages</span>
          </div>
          <div className="markdown-body">
            <pre>{s.bodyMd}</pre>
          </div>
        </div>
      ))}
      {summaries.length > 0 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={offset === 0 || loading}
            onClick={() => load(Math.max(offset - limit, 0))}
          >
            Previous
          </button>
          <span>
            {offset + 1}–{Math.min(offset + summaries.length, total)} of {total}
          </span>
          <button
            className="btn btn-secondary"
            disabled={offset + summaries.length >= total || loading}
            onClick={() => load(offset + limit)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

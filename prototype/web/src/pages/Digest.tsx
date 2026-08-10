import { useState } from "react"
import { api } from "../api.js"

export function Digest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ summaryId: string; bodyMd: string; messageCount: number; waMessageId?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (last24h: boolean) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.digest(last24h)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-3">Run Digest</h2>
      <p className="text-muted">
        Summarize yesterday's messages from <code>TEST_GROUP_JID</code> and send the result to{" "}
        <code>REPORT_TO_JID</code>.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}
      {result && (
        <div className="alert alert-success">
          Digest created ({result.messageCount} messages). WA message ID: {result.waMessageId ?? "n/a"}
        </div>
      )}
      <div className="d-flex gap-2 mb-4">
        <button className="btn btn-primary" disabled={loading} onClick={() => run(false)}>
          <i className="bi bi-play-fill me-1" />
          {loading ? "Running…" : "Run Yesterday"}
        </button>
        <button className="btn btn-outline-secondary" disabled={loading} onClick={() => run(true)}>
          Run Last 24h
        </button>
      </div>
      {result && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Summary</h5>
            <div className="markdown-body">
              <pre className="bg-body-tertiary p-3 rounded">{result.bodyMd}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

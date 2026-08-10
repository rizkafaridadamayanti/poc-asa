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
      <h2 className="page-title">Run Digest</h2>
      <p>
        Summarize yesterday’s messages from <code>TEST_GROUP_JID</code> and send the result to{" "}
        <code>REPORT_TO_JID</code>.
      </p>
      {error && <div className="alert error">{error}</div>}
      {result && (
        <div className="alert success">
          Digest created ({result.messageCount} messages). WA message ID: {result.waMessageId ?? "n/a"}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn" disabled={loading} onClick={() => run(false)}>
          {loading ? "Running…" : "Run Yesterday"}
        </button>
        <button className="btn btn-secondary" disabled={loading} onClick={() => run(true)}>
          Run Last 24h
        </button>
      </div>
      {result && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h3>Summary</h3>
          <div className="markdown-body">
            <pre>{result.bodyMd}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

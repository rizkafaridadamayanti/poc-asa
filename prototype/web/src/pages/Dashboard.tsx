import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { api, type Status, type Sentiment } from "../api.js"

function StatCard({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="fs-3 text-primary">
            <i className={`bi ${icon}`} />
          </div>
          <div>
            <div className="text-muted text-uppercase small">{label}</div>
            <div className="fs-4 fw-semibold">{value}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { connected } = useOutletContext<{ connected: boolean | null }>()
  const [status, setStatus] = useState<Status | null>(null)
  const [latestSentiment, setLatestSentiment] = useState<Sentiment | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    api
      .status()
      .then((s) => {
        if (mounted) setStatus(s)
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      })
    api
      .sentiments()
      .then((res) => {
        if (mounted) setLatestSentiment(res.sentiments[0] ?? null)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const isConnected = connected ?? status?.connected ?? false

  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {!status && !error && <p className="text-muted">Loading status…</p>}
      {status && (
        <>
          <div className="row g-3 mb-4">
            <StatCard
              icon="bi-whatsapp"
              label="WA Connection"
              value={
                <span className={`badge ${isConnected ? "text-bg-success" : "text-bg-danger"}`}>
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              }
            />
            <StatCard icon="bi-chat-dots" label="Messages" value={status.messageCount} />
            <StatCard icon="bi-journal-text" label="Summaries" value={status.summaryCount} />
            <StatCard icon="bi-people" label="Participants" value={status.participantCount} />
          </div>

          {latestSentiment && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Sentiment Harian Pusat</h5>
                <p className="text-muted small">
                  {new Date(latestSentiment.periodStart).toLocaleDateString()} ·{" "}
                  {latestSentiment.messageCount} pesan
                </p>
                <div className="markdown-body">
                  <pre className="bg-body-tertiary p-3 rounded">{latestSentiment.bodyMd}</pre>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-info-circle me-2" />
                Getting started
              </h5>
              <p className="card-text mb-0">
                Pair this server with a disposable WhatsApp test number. Use the{" "}
                <strong>Send</strong> page to send messages, <strong>Messages</strong> to review
                inbound chat, and <strong>Digest</strong> to generate daily summaries.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

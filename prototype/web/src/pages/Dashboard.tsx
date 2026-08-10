import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { api, type Status } from "../api.js"

export function Dashboard() {
  const { connected } = useOutletContext<{ connected: boolean | null }>()
  const [status, setStatus] = useState<Status | null>(null)
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
    return () => {
      mounted = false
    }
  }, [])

  const isConnected = connected ?? status?.connected ?? false

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      {error && <div className="alert error">{error}</div>}
      {!status && !error && <p className="loading">Loading status…</p>}
      {status && (
        <>
          <div className="grid">
            <div className="card">
              <h3>WA Connection</h3>
              <span className={`status-badge ${isConnected ? "connected" : "disconnected"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="card">
              <h3>Messages</h3>
              <div className="value">{status.messageCount}</div>
            </div>
            <div className="card">
              <h3>Summaries</h3>
              <div className="value">{status.summaryCount}</div>
            </div>
            <div className="card">
              <h3>Participants</h3>
              <div className="value">{status.participantCount}</div>
            </div>
          </div>
          <div className="card">
            <h3>Getting started</h3>
            <p>
              Pair this server with a disposable WhatsApp test number. Use the{" "}
              <strong>Send</strong> page to send messages, <strong>Messages</strong> to review
              inbound chat, and <strong>Digest</strong> to generate daily summaries.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

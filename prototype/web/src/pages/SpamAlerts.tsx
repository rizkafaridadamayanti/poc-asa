import { useEffect, useState } from "react"
import { api, type SpamAlert } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

export function SpamAlerts() {
  const [alerts, setAlerts] = useState<SpamAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.spamAlerts()
      setAlerts(res.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <PageHeader
        icon="bi-shield-exclamation"
        color={NAV_COLORS.spamAlerts}
        title="Spam / Fraud Alerts"
        subtitle="Pesan realtime yang lolos heuristik spam/fraud/hoax (skor ≥ 50) otomatis masuk di sini dan dikirim ke Pusat."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      <button className="btn btn-outline-secondary mb-3" onClick={load} disabled={loading}>
        <i className="bi bi-arrow-clockwise me-1" />
        {loading ? "Refreshing…" : "Refresh"}
      </button>

      {!loading && alerts.length === 0 && <p className="text-muted fst-italic">No spam alerts yet.</p>}

      {alerts.map((a) => (
        <div key={a._id} className="card mb-3 border-danger-subtle">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <span className="badge text-bg-danger">score {a.spamScore}/100</span>
                {a.notified && (
                  <span className="badge text-bg-success ms-2">
                    <i className="bi bi-send-check me-1" />
                    pushed to Pusat
                  </span>
                )}
              </div>
              <span className="text-muted small text-nowrap">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="my-3" style={{ whiteSpace: "pre-wrap" }}>
              {a.text}
            </p>
            <p className="text-muted small my-1">
              Dari <strong>{a.fromJid}</strong> di <strong>{a.chatJid}</strong>
            </p>
            <p className="text-muted small mb-0">Alasan: {a.reasons.join(", ")}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

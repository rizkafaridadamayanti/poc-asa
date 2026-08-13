import { useEffect, useState } from "react"
import { api, type SpamAlert, type SpamAlertStatus } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

const FILTERS: { value: SpamAlertStatus | "all"; label: string; icon: string }[] = [
  { value: "open", label: "Baru", icon: "bi-exclamation-triangle" },
  { value: "confirmed", label: "Dikonfirmasi", icon: "bi-shield-x" },
  { value: "dismissed", label: "Bukan Spam", icon: "bi-shield-check" },
  { value: "all", label: "Semua", icon: "bi-list-ul" },
]

export function SpamAlerts() {
  const [alerts, setAlerts] = useState<SpamAlert[]>([])
  const [filter, setFilter] = useState<SpamAlertStatus | "all">("open")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.spamAlerts(filter === "all" ? undefined : filter)
      setAlerts(res.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const setStatus = async (id: string, status: SpamAlertStatus) => {
    setBusyId(id)
    setError(null)
    try {
      await api.setSpamAlertStatus(id, status)
      setAlerts((prev) => prev.filter((a) => a._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Keamanan"
        color={NAV_COLORS.spamAlerts}
        title="Spam / Fraud Alert"
        subtitle="Pesan grup/DM yang lolos heuristik spam-fraud (skor ≥ 50) otomatis masuk sini dan langsung dikirim ke Pusat lewat WA — halaman ini untuk menindaklanjuti, bukan cuma arsip."
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <div className="segmented-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`segmented-tab${filter === f.value ? " active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              <i className={`bi ${f.icon}`} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-muted">Memuat…</p>}
      {!loading && alerts.length === 0 && (
        <EmptyState
          icon={filter === "open" ? "bi-shield-check" : "bi-inbox"}
          text={filter === "open" ? "Tidak ada alert baru — aman." : "Tidak ada data untuk filter ini."}
        />
      )}

      {alerts.map((a) => (
        <div key={a._id} className={`card mb-3 ${a.status === "open" ? "border-danger-subtle" : ""}`}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <span className="badge rounded-pill text-bg-danger">Skor {a.spamScore}/100</span>
                {a.status === "confirmed" && <span className="badge rounded-pill text-bg-secondary">Dikonfirmasi spam</span>}
                {a.status === "dismissed" && <span className="badge rounded-pill text-bg-secondary">Bukan spam</span>}
                {a.notified && (
                  <span className="text-muted small">
                    <i className="bi bi-send-check me-1" />
                    sudah dikirim ke Pusat
                  </span>
                )}
              </div>
              <span className="text-muted small text-nowrap">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            <p className="my-3" style={{ whiteSpace: "pre-wrap" }}>
              {a.text}
            </p>
            <p className="text-muted small mb-1">
              Dari <strong>{a.fromJid}</strong> di <strong>{a.chatJid}</strong>
            </p>
            <div className="d-flex flex-wrap gap-1 mb-3">
              {a.reasons.map((r, i) => (
                <span key={i} className="stat-pill">
                  {r}
                </span>
              ))}
            </div>
            {a.status === "open" && (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setStatus(a._id, "confirmed")}
                  disabled={busyId === a._id}
                >
                  <i className="bi bi-shield-x me-1" />
                  Konfirmasi Spam
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setStatus(a._id, "dismissed")}
                  disabled={busyId === a._id}
                >
                  <i className="bi bi-shield-check me-1" />
                  Bukan Spam
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

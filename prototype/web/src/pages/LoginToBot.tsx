import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { api } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

type OutletCtx = {
  connected: boolean | null
  qr: string | null
  disconnectReason: string | null
}

const REASON_LABEL: Record<string, string> = {
  loggedOut: "Logged out from phone — delete auth_session/ and scan a fresh QR to re-pair.",
  disconnected: "Connection dropped — the bridge will retry automatically.",
}

export function LoginToBot() {
  const { connected, qr: liveQr, disconnectReason } = useOutletContext<OutletCtx>()
  const [manualQr, setManualQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const qr = liveQr || manualQr

  const fetchQr = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.qr()
      setCheckedAt(new Date())
      if (res.qr) {
        setManualQr(res.qr)
      } else if (!res.connected) {
        setError("QR not available yet, try again in a moment.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QR")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (connected) {
      setManualQr(null)
    } else if (connected === false && !liveQr) {
      fetchQr()
    }
  }, [connected, liveQr, fetchQr])

  const statusLabel = connected === null ? "Syncing…" : connected ? "Connected" : "Disconnected"

  return (
    <div>
      <PageHeader icon="bi-qr-code" color={NAV_COLORS.loginToBot} title="Login to Bot" />

      <div className="card mb-4" style={{ maxWidth: "420px" }}>
        <div className="card-body">
          <h5 className="card-title">Connection status</h5>
          <span className={`badge ${connected ? "text-bg-success" : "text-bg-danger"}`}>
            {statusLabel}
          </span>
          {connected === false && disconnectReason && (
            <p className="text-danger small mt-3 mb-0">
              {REASON_LABEL[disconnectReason] ?? disconnectReason}
            </p>
          )}
          {checkedAt && (
            <p className="text-muted small mt-3 mb-0">
              Last checked {checkedAt.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {connected ? (
        <div className="card" style={{ maxWidth: "420px" }}>
          <div className="card-body">
            <h5 className="card-title">
              <i className="bi bi-check-circle text-success me-2" />
              Bot is paired
            </h5>
            <p className="text-muted mb-0">
              The WhatsApp bridge is connected. No QR needed — this session stays active until
              it's logged out from the phone or the local session is cleared.
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: "420px" }}>
          <div className="card-body">
            <h5 className="card-title">Scan to pair</h5>
            <p className="text-muted small">
              Open WhatsApp on the test phone → Settings → Linked Devices → Link a Device → scan
              this QR code.
            </p>
            {error && <div className="alert alert-danger">{error}</div>}
            <div
              className="d-flex justify-content-center align-items-center my-4"
              style={{ minHeight: "260px" }}
            >
              {qr ? (
                <QRCodeSVG value={qr} size={260} />
              ) : (
                <p className="text-muted">{loading ? "Loading QR…" : "Waiting for QR…"}</p>
              )}
            </div>
            <button className="btn btn-primary" onClick={fetchQr} disabled={loading}>
              <i className="bi bi-arrow-clockwise me-1" />
              {loading ? "Refreshing…" : "Refresh QR"}
            </button>
            <p className="text-muted small mt-3 mb-0">
              QR codes rotate automatically roughly every 20 seconds while waiting to pair.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

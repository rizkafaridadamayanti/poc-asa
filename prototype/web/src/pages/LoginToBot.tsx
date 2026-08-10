import { useCallback, useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import { api } from "../api.js"

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
      <h2 className="page-title">Login to Bot</h2>

      <div className="card" style={{ marginBottom: "1.5rem", maxWidth: "420px" }}>
        <h3>Connection status</h3>
        <span className={`status-badge ${connected ? "connected" : "disconnected"}`}>
          {statusLabel}
        </span>
        {connected === false && disconnectReason && (
          <p style={{ color: "var(--danger)", marginTop: "0.75rem", fontSize: "0.9rem" }}>
            {REASON_LABEL[disconnectReason] ?? disconnectReason}
          </p>
        )}
        {checkedAt && (
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.75rem" }}>
            Last checked {checkedAt.toLocaleTimeString()}
          </p>
        )}
      </div>

      {connected ? (
        <div className="card" style={{ maxWidth: "420px" }}>
          <h3>Bot is paired</h3>
          <p style={{ color: "var(--muted)" }}>
            The WhatsApp bridge is connected. No QR needed — this session stays active until it's
            logged out from the phone or the local session is cleared.
          </p>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: "420px" }}>
          <h3>Scan to pair</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Open WhatsApp on the test phone → Settings → Linked Devices → Link a Device → scan
            this QR code.
          </p>
          {error && <div className="alert error">{error}</div>}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "260px",
              margin: "1.25rem 0",
            }}
          >
            {qr ? (
              <QRCodeSVG value={qr} size={260} />
            ) : (
              <p className="loading">{loading ? "Loading QR…" : "Waiting for QR…"}</p>
            )}
          </div>
          <button className="btn" onClick={fetchQr} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh QR"}
          </button>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.75rem" }}>
            QR codes rotate automatically roughly every 20 seconds while waiting to pair.
          </p>
        </div>
      )}
    </div>
  )
}

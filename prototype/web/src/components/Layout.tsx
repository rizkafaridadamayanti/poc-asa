import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { api, clearToken } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { QrModal } from "./QrModal.js"
import { ToastContainer, useToasts } from "./Toasts.js"

export function Layout() {
  const navigate = useNavigate()
  const { connected, qr: liveQr, lastInbound, error, dismissQr } = useEvents()
  const [manualQr, setManualQr] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const { toasts, add, remove } = useToasts()

  const handleLogout = () => {
    clearToken()
    navigate("/login")
  }

  const activeQr = liveQr || manualQr

  const showQr = async () => {
    setLoadingQr(true)
    try {
      const res = await api.qr()
      if (res.qr) {
        setManualQr(res.qr)
      } else {
        add(res.connected ? "Already connected — no QR available" : "No QR available yet", "info")
      }
    } catch (err) {
      add(err instanceof Error ? err.message : "Failed to load QR", "error")
    } finally {
      setLoadingQr(false)
    }
  }

  useEffect(() => {
    if (connected === true) {
      add("WhatsApp connected", "success")
      setManualQr(null)
    } else if (connected === false) {
      add("WhatsApp disconnected", "error")
    }
  }, [connected])

  useEffect(() => {
    if (lastInbound) {
      const from = (lastInbound.fromJid as string) || "unknown"
      add(`New message from ${from.split("@")[0]}`, "info")
    }
  }, [lastInbound])

  useEffect(() => {
    if (error) add(error, "error")
  }, [error])

  return (
    <div className="layout">
      <nav className="sidebar">
        <h1>ASA Dashboard</h1>
        <div style={{ marginBottom: "1rem" }}>
          {connected === null ? (
            <span className="status-badge disconnected">Syncing…</span>
          ) : connected ? (
            <span className="status-badge connected">WA Connected</span>
          ) : (
            <span className="status-badge disconnected">WA Disconnected</span>
          )}
        </div>
        <button
          className="btn"
          style={{ width: "100%", marginBottom: "1rem", justifyContent: "center" }}
          onClick={showQr}
          disabled={loadingQr}
        >
          {loadingQr ? "Loading…" : "Show QR"}
        </button>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/messages">Messages</NavLink>
        <NavLink to="/summaries">Summaries</NavLink>
        <NavLink to="/groups">Groups</NavLink>
        <NavLink to="/infografis">Infografis</NavLink>
        <NavLink to="/send">Send</NavLink>
        <NavLink to="/digest">Digest</NavLink>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <main className="main">
        <Outlet context={{ connected, lastInbound }} />
      </main>
      {activeQr && <QrModal qr={activeQr} onClose={() => { dismissQr(); setManualQr(null) }} />}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

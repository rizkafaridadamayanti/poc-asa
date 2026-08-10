import { useEffect } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { clearToken } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { ToastContainer, useToasts } from "./Toasts.js"

export function Layout() {
  const navigate = useNavigate()
  const { connected, qr, disconnectReason, lastInbound, error } = useEvents()
  const { toasts, add, remove } = useToasts()

  const handleLogout = () => {
    clearToken()
    navigate("/login")
  }

  useEffect(() => {
    if (connected === true) {
      add("WhatsApp connected", "success")
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
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/login-to-bot">Login to Bot</NavLink>
        <NavLink to="/messages">Messages</NavLink>
        <NavLink to="/summaries">Summaries</NavLink>
        <NavLink to="/send">Send</NavLink>
        <NavLink to="/digest">Digest</NavLink>
        <NavLink to="/informasi-baru">Informasi Baru</NavLink>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ width: "100%" }} onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <main className="main">
        <Outlet context={{ connected, qr, disconnectReason, lastInbound }} />
      </main>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

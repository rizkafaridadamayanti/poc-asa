import { useEffect } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { clearToken } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { ToastContainer, useToasts } from "./Toasts.js"

const NAV_ITEMS: Array<{ to: string; end?: boolean; icon: string; label: string }> = [
  { to: "/", end: true, icon: "bi-speedometer2", label: "Dashboard" },
  { to: "/login-to-bot", icon: "bi-qr-code", label: "Login to Bot" },
  { to: "/messages", icon: "bi-chat-dots", label: "Messages" },
  { to: "/summaries", icon: "bi-journal-text", label: "Summaries" },
  { to: "/groups", icon: "bi-people", label: "Groups" },
  { to: "/infografis", icon: "bi-bar-chart", label: "Infografis" },
  { to: "/send", icon: "bi-send", label: "Send" },
  { to: "/digest", icon: "bi-envelope-paper", label: "Digest" },
  { to: "/informasi-baru", icon: "bi-megaphone", label: "Informasi Baru" },
  { to: "/pengingat-agenda", icon: "bi-calendar-event", label: "Pengingat Agenda" },
  { to: "/spam-alerts", icon: "bi-shield-exclamation", label: "Spam Alerts" },
  { to: "/qa", icon: "bi-question-circle", label: "Tanya Jawab" },
  { to: "/antrian-ide", icon: "bi-lightbulb", label: "Antrian Ide" },
]

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

  const statusBadge =
    connected === null ? (
      <span className="badge text-bg-secondary">Syncing…</span>
    ) : connected ? (
      <span className="badge text-bg-success">WA Connected</span>
    ) : (
      <span className="badge text-bg-danger">WA Disconnected</span>
    )

  return (
    <div className="d-flex">
      <nav className="sidebar bg-dark d-flex flex-column p-3 flex-shrink-0">
        <span className="fs-4 fw-bold text-white mb-1">ASA Dashboard</span>
        <div className="mb-3">{statusBadge}</div>
        <ul className="nav nav-pills flex-column mb-auto overflow-auto gap-1">
          {NAV_ITEMS.map((item) => (
            <li className="nav-item" key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2${isActive ? " active" : ""}`
                }
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button className="btn btn-outline-light mt-3" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2" />
          Logout
        </button>
      </nav>
      <main className="main-content flex-grow-1 p-4">
        <Outlet context={{ connected, qr, disconnectReason, lastInbound }} />
      </main>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

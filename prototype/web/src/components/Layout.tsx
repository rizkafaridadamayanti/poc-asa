import { useEffect, useRef } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { Offcanvas } from "bootstrap"
import { clearToken } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { NAV_COLORS } from "../navColors.js"
import { ToastContainer, useToasts } from "./Toasts.js"

const NAV_ITEMS: Array<{ to: string; end?: boolean; icon: string; label: string; color: string }> = [
  { to: "/", end: true, icon: "bi-speedometer2", label: "Dashboard", color: NAV_COLORS.dashboard },
  { to: "/login-to-bot", icon: "bi-qr-code", label: "Login to Bot", color: NAV_COLORS.loginToBot },
  { to: "/messages", icon: "bi-chat-dots", label: "Messages", color: NAV_COLORS.messages },
  { to: "/summaries", icon: "bi-journal-text", label: "Summaries", color: NAV_COLORS.summaries },
  { to: "/groups", icon: "bi-people", label: "Groups", color: NAV_COLORS.groups },
  { to: "/infografis", icon: "bi-bar-chart", label: "Infografis", color: NAV_COLORS.infografis },
  { to: "/send", icon: "bi-send", label: "Send", color: NAV_COLORS.send },
  { to: "/digest", icon: "bi-envelope-paper", label: "Digest", color: NAV_COLORS.digest },
  { to: "/informasi-baru", icon: "bi-megaphone", label: "Informasi Baru", color: NAV_COLORS.informasiBaru },
  { to: "/pengingat-agenda", icon: "bi-calendar-event", label: "Pengingat Agenda", color: NAV_COLORS.pengingatAgenda },
  { to: "/spam-alerts", icon: "bi-shield-exclamation", label: "Spam Alerts", color: NAV_COLORS.spamAlerts },
  { to: "/qa", icon: "bi-question-circle", label: "Tanya Jawab", color: NAV_COLORS.qa },
  { to: "/antrian-ide", icon: "bi-lightbulb", label: "Antrian Ide", color: NAV_COLORS.antrianIde },
]

export function Layout() {
  const navigate = useNavigate()
  const offcanvasRef = useRef<HTMLDivElement>(null)
  const { connected, qr, disconnectReason, lastInbound, error } = useEvents()
  const { toasts, add, remove } = useToasts()

  const handleLogout = () => {
    clearToken()
    navigate("/login")
  }

  // The offcanvas is driven entirely through this JS API, not data-bs-* attributes:
  // 1) data-bs-dismiss calls preventDefault(), which makes react-router's Link skip
  //    its own navigation when the click also targets a NavLink.
  // 2) Mixing data-api (which needs the full bootstrap.bundle.min.js side-effect
  //    import) with this ESM import loads two independent copies of Bootstrap, each
  //    registering its own document click listener — one physical click then opens
  //    the offcanvas twice, leaving an orphaned backdrop behind.
  const closeMobileSidebar = () => {
    if (offcanvasRef.current) {
      Offcanvas.getOrCreateInstance(offcanvasRef.current).hide()
    }
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
    <div className="d-flex flex-column flex-lg-row min-vh-100">
      <nav className="navbar navbar-light bg-white border-bottom d-lg-none px-3">
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => {
            if (offcanvasRef.current) {
              Offcanvas.getOrCreateInstance(offcanvasRef.current).toggle()
            }
          }}
          aria-controls="sidebarOffcanvas"
        >
          <i className="bi bi-list fs-4" />
        </button>
        <span className="navbar-brand ms-2 mb-0 fw-bold">ASA Dashboard</span>
      </nav>

      <div
        className="offcanvas-lg offcanvas-start bg-white sidebar flex-shrink-0"
        tabIndex={-1}
        id="sidebarOffcanvas"
        ref={offcanvasRef}
      >
        <div className="offcanvas-header d-lg-none">
          <span className="fs-5 fw-bold">ASA Dashboard</span>
          <button type="button" className="btn-close" onClick={closeMobileSidebar} aria-label="Close" />
        </div>
        <div className="offcanvas-body d-flex flex-column p-3">
          <div className="sidebar-brand d-none d-lg-flex mb-1">
            <span className="sidebar-brand-mark">
              <i className="bi bi-whatsapp" />
            </span>
            <span className="fs-5 fw-bold">ASA Dashboard</span>
          </div>
          <div className="mb-3">{statusBadge}</div>
          <hr className="sidebar-divider" />
          <ul className="nav nav-pills flex-column mb-auto overflow-auto gap-1">
            {NAV_ITEMS.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeMobileSidebar}
                  style={{ "--item-color": item.color } as React.CSSProperties}
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
          <button
            className="btn btn-outline-secondary mt-3"
            onClick={() => {
              closeMobileSidebar()
              handleLogout()
            }}
          >
            <i className="bi bi-box-arrow-right me-2" />
            Logout
          </button>
        </div>
      </div>

      <main className="main-content flex-grow-1 p-4">
        <Outlet context={{ connected, qr, disconnectReason, lastInbound }} />
      </main>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
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

const COLLAPSE_KEY = "asa_sidebar_collapsed"

export function Layout() {
  const navigate = useNavigate()
  const offcanvasRef = useRef<HTMLDivElement>(null)
  const { connected, qr, disconnectReason, lastInbound, error } = useEvents()
  const { toasts, add, remove } = useToasts()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")

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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0")
      return next
    })
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
    <div className="d-flex flex-column vh-100 overflow-hidden">
      <header className="app-topbar d-flex align-items-center justify-content-between px-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary d-lg-none"
            type="button"
            onClick={() => {
              if (offcanvasRef.current) {
                Offcanvas.getOrCreateInstance(offcanvasRef.current).toggle()
              }
            }}
            aria-controls="sidebarOffcanvas"
          >
            <i className="bi bi-list fs-5" />
          </button>
          <span className="sidebar-brand-mark">
            <i className="bi bi-whatsapp" />
          </span>
          <span className="fs-5 fw-bold text-nowrap">ASA Dashboard</span>
        </div>
        {statusBadge}
      </header>

      <div className="d-flex flex-grow-1 overflow-hidden">
        <div
          className={`offcanvas-lg offcanvas-start bg-white sidebar flex-shrink-0${collapsed ? " sidebar-collapsed" : ""}`}
          tabIndex={-1}
          id="sidebarOffcanvas"
          ref={offcanvasRef}
        >
          <button
            type="button"
            className="sidebar-toggle d-none d-lg-flex"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`bi ${collapsed ? "bi-chevron-right" : "bi-chevron-left"}`} />
          </button>

          <div className="offcanvas-header d-lg-none justify-content-end py-2">
            <button type="button" className="btn-close" onClick={closeMobileSidebar} aria-label="Close" />
          </div>
          <div className="offcanvas-body d-flex flex-column p-3">
            <ul className="nav nav-pills flex-column mb-auto overflow-auto gap-1">
              {NAV_ITEMS.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={closeMobileSidebar}
                    title={collapsed ? item.label : undefined}
                    style={{ "--item-color": item.color } as React.CSSProperties}
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center gap-2${isActive ? " active" : ""}`
                    }
                  >
                    <i className={`bi ${item.icon}`} />
                    <span className={collapsed ? "d-lg-none" : ""}>{item.label}</span>
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
              title={collapsed ? "Logout" : undefined}
            >
              <i className={`bi bi-box-arrow-right${collapsed ? "" : " me-2"}`} />
              <span className={collapsed ? "d-lg-none" : ""}>Logout</span>
            </button>
          </div>
        </div>

        <main className="main-content flex-grow-1 p-4">
          <Outlet context={{ connected, qr, disconnectReason, lastInbound }} />
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

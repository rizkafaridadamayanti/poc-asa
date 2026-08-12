import { useEffect, useMemo, useRef, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { Offcanvas } from "bootstrap"
import { clearToken, getStoredUsername } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { NAV_COLORS } from "../navColors.js"
import { ToastContainer, useToasts } from "./Toasts.js"

type NavItem = { to: string; end?: boolean; icon: string; label: string; group: string; color: string }

const NAV_ITEMS: NavItem[] = [
  { to: "/", end: true, icon: "bi-speedometer2", label: "Dashboard", group: "Utama", color: NAV_COLORS.dashboard },
  { to: "/login-to-bot", icon: "bi-qr-code", label: "Login to Bot", group: "Utama", color: NAV_COLORS.loginToBot },
  { to: "/messages", icon: "bi-chat-dots", label: "Messages", group: "Utama", color: NAV_COLORS.messages },
  { to: "/summaries", icon: "bi-journal-text", label: "Summaries", group: "Summary & Insights", color: NAV_COLORS.summaries },
  { to: "/groups", icon: "bi-people", label: "Groups", group: "Summary & Insights", color: NAV_COLORS.groups },
  { to: "/infografis", icon: "bi-bar-chart", label: "Infografis", group: "Summary & Insights", color: NAV_COLORS.infografis },
  { to: "/digest", icon: "bi-envelope-paper", label: "Digest", group: "Summary & Insights", color: NAV_COLORS.digest },
  { to: "/send", icon: "bi-send", label: "Send", group: "Engagement & Safety", color: NAV_COLORS.send },
  { to: "/informasi-baru", icon: "bi-megaphone", label: "Informasi Baru", group: "Engagement & Safety", color: NAV_COLORS.informasiBaru },
  { to: "/pengingat-agenda", icon: "bi-calendar-event", label: "Pengingat Agenda", group: "Engagement & Safety", color: NAV_COLORS.pengingatAgenda },
  { to: "/spam-alerts", icon: "bi-shield-exclamation", label: "Spam Alerts", group: "Engagement & Safety", color: NAV_COLORS.spamAlerts },
  { to: "/qa", icon: "bi-question-circle", label: "Tanya Jawab", group: "Engagement & Safety", color: NAV_COLORS.qa },
  { to: "/antrian-ide", icon: "bi-lightbulb", label: "Antrian Ide", group: "Engagement & Safety", color: NAV_COLORS.antrianIde },
]

const NAV_GROUPS: string[] = Array.from(new Set(NAV_ITEMS.map((item) => item.group)))

const COLLAPSE_KEY = "asa_sidebar_collapsed"

function initialsOf(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return cleaned.slice(0, 2).toUpperCase()
}

export function Layout() {
  const navigate = useNavigate()
  const offcanvasRef = useRef<HTMLDivElement>(null)
  const { connected, qr, disconnectReason, lastInbound, error } = useEvents()
  const { toasts, add, remove } = useToasts()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")
  const username = getStoredUsername() || "Pengurus"

  const today = useMemo(
    () => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    [],
  )

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
  //    the offcanvas twice, leaving an orphaned backdrop behind. The user-menu dropdown
  //    below is left to the bundle's own data-api instead, since nothing here creates a
  //    second, competing Dropdown instance for it.
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
          <div className="d-none d-sm-block lh-sm">
            <div className="fs-6 fw-bold">ASA Dashboard</div>
            <div className="text-muted app-topbar-subtitle">WhatsApp Bridge — Karang Taruna</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          {statusBadge}
          <span className="text-muted small d-none d-md-inline text-capitalize">{today}</span>
          <div className="vr d-none d-md-block" style={{ height: "28px" }} />
          <div className="dropdown">
            <button
              type="button"
              className="btn user-chip d-flex align-items-center gap-2"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="user-avatar">{initialsOf(username)}</span>
              <span className="d-none d-sm-block text-start lh-sm">
                <span className="d-block fw-semibold small text-capitalize">{username}</span>
                <span className="d-block user-chip-role">PENGURUS PUSAT</span>
              </span>
              <i className="bi bi-chevron-down small text-muted" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <button type="button" className="dropdown-item" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div className="d-flex flex-grow-1 overflow-hidden">
        <div
          className={`offcanvas-lg offcanvas-start sidebar flex-shrink-0${collapsed ? " sidebar-collapsed" : ""}`}
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
            <div className="sidebar-nav-scroll flex-grow-1 overflow-auto">
              {NAV_GROUPS.map((group, idx) => (
                <div key={group} className={idx > 0 ? "mt-2" : ""}>
                  <div className={`sidebar-group-label${collapsed ? " d-lg-none" : ""}`}>{group}</div>
                  <ul className="nav flex-column gap-1">
                    {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
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
                </div>
              ))}
            </div>
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

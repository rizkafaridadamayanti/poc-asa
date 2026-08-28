import { useEffect, useMemo, useRef, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Users,
  BarChart3,
  Send,
  CalendarCheck2,
  ShieldAlert,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
  ChevronDown,
} from "lucide-react"
import { api, clearToken, getStoredUsername } from "../api.js"
import { useEvents } from "../hooks/useEvents.js"
import { NAV_COLORS } from "../navColors.js"
import { ToastContainer, useToasts } from "./Toasts.js"

type NavItem = {
  to: string
  end?: boolean
  icon: typeof LayoutDashboard
  label: string
  color: string
  badgeKey?: "spam" | "ideas"
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", end: true, icon: LayoutDashboard, label: "Dashboard", color: NAV_COLORS.dashboard },
  { to: "/messages", icon: MessageSquareText, label: "Messages", color: NAV_COLORS.messages },
  { to: "/summaries", icon: FileText, label: "Summaries", color: NAV_COLORS.summaries },
  { to: "/groups", icon: Users, label: "Groups", color: NAV_COLORS.groups },
  { to: "/infografis", icon: BarChart3, label: "Infografis", color: NAV_COLORS.infografis },
  { to: "/informasi-baru", icon: Send, label: "Kelola Pesan", color: NAV_COLORS.informasiBaru },
  { to: "/pengingat-agenda", icon: CalendarCheck2, label: "Pengingat Agenda", color: NAV_COLORS.pengingatAgenda },
  { to: "/spam-alerts", icon: ShieldAlert, label: "Spam Alert", color: NAV_COLORS.spamAlerts, badgeKey: "spam" },
  { to: "/antrian-ide", icon: Lightbulb, label: "Antrian Ide", color: NAV_COLORS.antrianIde, badgeKey: "ideas" },
]

const COLLAPSE_KEY = "asa_sidebar_collapsed"

function initialsOf(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return cleaned.slice(0, 2).toUpperCase()
}

function formatWaNumber(id: string): string {
  return `+${id.split(":")[0].split("@")[0]}`
}

export function Layout() {
  const navigate = useNavigate()
  const { connected, qr, disconnectReason, device, lastInbound, error } = useEvents()
  const { toasts, add, remove } = useToasts()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const username = getStoredUsername() || "Admin"
  const [spamCount, setSpamCount] = useState(0)
  const [ideaCount, setIdeaCount] = useState(0)

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
        new Date(),
      ),
    [],
  )

  const handleLogout = () => {
    clearToken()
    navigate("/login")
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0")
      return next
    })
  }

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  useEffect(() => {
    if (connected === true) add("WhatsApp connected", "success")
    else if (connected === false) add("WhatsApp disconnected", "error")
  }, [connected])

  useEffect(() => {
    if (lastInbound) {
      const from = ((lastInbound as Record<string, unknown>).fromJid as string) || "unknown"
      add(`New message from ${from.split("@")[0]}`, "info")
    }
  }, [lastInbound])

  useEffect(() => {
    if (error) add(error, "error")
  }, [error])

  useEffect(() => {
    api.spamAlerts("open").then((res) => setSpamCount(res.alerts.length)).catch(() => {})
    api.anonymousIdeas("new").then((res) => setIdeaCount(res.ideas.length)).catch(() => {})
  }, [lastInbound])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Topbar */}
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">ASA</span>
                <span className="text-[10px] text-blue-700 font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                  PRO ENGINE
                </span>
              </div>
              <span className="text-[10px] text-slate-500 tracking-wide font-medium">
                WhatsApp Bridge • Karang Taruna
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="relative" ref={statusMenuRef}>
            <button
              onClick={() => setStatusMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                connected
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : connected === false
                    ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                    : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    connected ? "bg-emerald-500" : connected === false ? "bg-rose-500" : "bg-slate-400"
                  }`}
                />
              </span>
              <span className="tracking-tight">
                {connected ? "CONNECTED" : connected === false ? "DISCONNECTED" : "SYNCING…"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {statusMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-xs animate-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">Status Bridge WhatsApp</span>
                </div>
                {connected && device ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Perangkat:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[120px]">{device.name || "—"}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Nomor HP:</span>
                      <span className="font-mono font-bold text-blue-600">{formatWaNumber(device.id)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform:</span>
                      <span className="font-semibold text-slate-800">{device.platform || "—"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">
                    {disconnectReason ?? "Belum tersambung — scan QR di halaman Dashboard."}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Hari ini</span>
              <span className="text-xs font-semibold text-slate-700 capitalize">{today}</span>
            </div>
          </div>
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm shadow-blue-500/20">
              {initialsOf(username)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight capitalize">{username}</span>
              <span className="text-[10px] font-bold text-blue-600 tracking-wider">ADMIN PUSAT</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-xs animate-in">
              <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                <p className="font-bold text-slate-900 truncate capitalize">{username}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                  ADMIN PUSAT
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex relative">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200/90 transition-all duration-300 select-none shadow-sm
            ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
            ${collapsed ? "lg:w-[72px]" : "lg:w-64"}
          `}
        >
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 lg:hidden">
            <span className="font-extrabold text-slate-900 text-sm">ASA WA-BOT</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden lg:flex items-center justify-between h-16 px-4 border-b border-slate-200">
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm leading-tight tracking-tight text-slate-900">ASA BRIDGE</span>
                  <span className="text-[9px] text-blue-600 font-extrabold tracking-widest uppercase">PRO ENGINE</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                </svg>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const count = item.badgeKey === "spam" ? spamCount : item.badgeKey === "ideas" ? ideaCount : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold"
                    } ${collapsed ? "justify-center px-2" : ""}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 shrink-0 ${
                          isActive ? "bg-white/20" : "bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: isActive ? "#fff" : item.color }} />
                      </div>
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {count > 0 && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none shrink-0 ${
                                isActive ? "bg-white/25 text-white" : item.badgeKey === "spam" ? "bg-rose-600 text-white animate-pulse" : "bg-teal-600 text-white"
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </div>
                      )}
                      {collapsed && count > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {!collapsed && (
            <div className="p-3.5 bg-blue-50/70 m-3 rounded-2xl border border-blue-100/80">
              <div className="text-[10px] text-blue-700 uppercase tracking-widest font-extrabold mb-1.5">
                Bridge Baileys
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Status Node</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className={`text-[11px] uppercase font-bold ${connected ? "text-emerald-700" : "text-amber-700"}`}>
                    {connected ? "Running" : "Syncing"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-50 w-6 h-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
            title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <div className="p-3 border-t border-slate-200 space-y-1 bg-white">
            <button
              onClick={() => {
                setMobileOpen(false)
                handleLogout()
              }}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer ${
                collapsed ? "justify-center" : ""
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main
          className={`flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full ${
            collapsed ? "lg:ml-[72px]" : "lg:ml-64"
          }`}
        >
          <Outlet context={{ connected, qr, disconnectReason, device, lastInbound }} />
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  )
}

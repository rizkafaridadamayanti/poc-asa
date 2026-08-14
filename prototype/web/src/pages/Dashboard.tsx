import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import {
  api,
  getStoredUsername,
  type Status,
  type Sentiment,
  type WaDevice,
  type PeakHourRow,
  type Group,
  type CuratedInfo,
  type Agenda,
  type SpamAlert,
  type AnonymousIdea,
  type OutboundLog,
} from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { ChatIllustration, BroadcastIllustration } from "../components/Illustrations.js"
import { NAV_COLORS } from "../navColors.js"

type OutletCtx = {
  connected: boolean | null
  qr: string | null
  disconnectReason: string | null
  device: WaDevice | null
}

const REASON_LABEL: Record<string, string> = {
  loggedOut: "Logged out from phone — delete auth_session/ and scan a fresh QR to re-pair.",
  disconnected: "Connection dropped — the bridge will retry automatically.",
}

function formatWaNumber(id: string): string {
  return `+${id.split(":")[0].split("@")[0]}`
}

// WhatsApp only exposes the OS of the paired phone (Android/iPhone), not an
// exact hardware model — the primary device in multi-device WA is always a
// phone, so this is the most specific "what device" info available.
const PLATFORM_LABEL: Record<string, { label: string; icon: string }> = {
  android: { label: "Android", icon: "bi-android2" },
  smba: { label: "Android (WhatsApp Business)", icon: "bi-android2" },
  iphone: { label: "iPhone", icon: "bi-apple" },
  smbi: { label: "iPhone (WhatsApp Business)", icon: "bi-apple" },
  ipad: { label: "iPad", icon: "bi-apple" },
}

function describePlatform(platform: string | null): { label: string; icon: string } {
  if (!platform) return { label: "Tidak diketahui", icon: "bi-phone" }
  return PLATFORM_LABEL[platform.toLowerCase()] ?? { label: platform, icon: "bi-phone" }
}

function greetingLabel(date: Date): string {
  const hour = date.getHours()
  if (hour < 11) return "Selamat pagi"
  if (hour < 15) return "Selamat siang"
  if (hour < 18) return "Selamat sore"
  return "Selamat malam"
}

function capitalizeWords(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

function StatCard({
  icon,
  label,
  subtitle,
  value,
  color,
  fraction,
  pillText,
}: {
  icon: string
  label: string
  subtitle: string
  value: React.ReactNode
  color: string
  fraction: number
  pillText: string
}) {
  return (
    <div className="card h-100" style={{ minWidth: 0 }}>
      <div className="card-body">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
              color,
            }}
          >
            <i className={`bi ${icon} fs-4`} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="text-muted text-uppercase small">{label}</div>
            <div className="fs-4 fw-semibold">{value}</div>
          </div>
        </div>
        <div className="text-muted small mb-2">{subtitle}</div>
        <div className="stat-card-track">
          <div
            className="stat-card-fill"
            style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="stat-pill mt-2 d-inline-flex">{pillText}</span>
      </div>
    </div>
  )
}

function MiniPeakHoursChart({ rows }: { rows: PeakHourRow[] }) {
  const maxCount = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">Peak chat hours</h5>
          <Link to="/infografis" className="small text-decoration-none">
            Lihat detail <i className="bi bi-arrow-right" />
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted small mb-0 flex-grow-1">Belum ada data pesan.</p>
        ) : (
          <div className="mini-chart-bars flex-grow-1">
            {Array.from({ length: 24 }, (_, hour) => {
              const row = rows.find((r) => r.hour === hour)
              const count = row?.count ?? 0
              return (
                <div
                  key={hour}
                  className="mini-chart-bar"
                  title={`${hour}:00 — ${count} pesan`}
                  style={{ height: `${Math.max((count / maxCount) * 100, 3)}%` }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type QuickLinkBadge = { text: string; tone: "amber" | "red" }

function QuickLinkTile({
  to,
  icon,
  label,
  accent,
  badge,
}: {
  to: string
  icon: string
  label: string
  accent: string
  badge?: QuickLinkBadge
}) {
  return (
    <Link to={to} className="quick-link-tile">
      <span
        className="quick-link-icon"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 15%, white)`, color: accent }}
      >
        <i className={`bi ${icon}`} />
      </span>
      <span className="quick-link-label">{label}</span>
      {badge && <span className={`quick-link-badge quick-link-badge-${badge.tone}`}>{badge.text}</span>}
    </Link>
  )
}

type ScopeCounts = { pusat: number; dusun: number; anggota: number; unreviewed: number }

function GroupsDonut({ counts }: { counts: ScopeCounts }) {
  const total = counts.pusat + counts.dusun + counts.anggota + counts.unreviewed
  const segments = [
    { label: "Pusat", value: counts.pusat, color: "#1e3a5f" },
    { label: "Dusun", value: counts.dusun, color: "#64748b" },
    { label: "Anggota", value: counts.anggota, color: "#cbd5e1" },
    { label: "Belum diatur", value: counts.unreviewed, color: "#d97706" },
  ].filter((s) => s.value > 0)

  let acc = 0
  const stops = segments.map((s) => {
    const start = (acc / total) * 360
    acc += s.value
    const end = (acc / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })
  const gradient = total > 0 ? `conic-gradient(${stops.join(", ")})` : "#e9ecf2"

  return (
    <div className="d-flex align-items-center gap-4 flex-wrap">
      <div className="donut-ring flex-shrink-0" style={{ background: gradient }}>
        <div className="donut-ring-hole">
          <div className="fs-4 fw-bold">{total}</div>
          <div className="text-muted small">Grup</div>
        </div>
      </div>
      {segments.length === 0 ? (
        <p className="text-muted small mb-0">Belum ada grup terdaftar.</p>
      ) : (
        <ul className="list-unstyled mb-0 flex-grow-1" style={{ minWidth: 140 }}>
          {segments.map((s) => (
            <li key={s.label} className="d-flex align-items-center gap-2 mb-2">
              <span className="donut-legend-dot" style={{ background: s.color }} />
              <span className="small text-muted flex-grow-1">{s.label}</span>
              <span className="small fw-semibold">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const WEEKDAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

type DayActivity = { sent: OutboundLog[]; scheduled: CuratedInfo[] }

function ActivityCalendar({
  outboundLogs,
  curatedInfos,
}: {
  outboundLogs: OutboundLog[]
  curatedInfos: CuratedInfo[]
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const activityByDay = useMemo(() => {
    const map = new Map<number, DayActivity>()
    const ensure = (day: number) => {
      let entry = map.get(day)
      if (!entry) {
        entry = { sent: [], scheduled: [] }
        map.set(day, entry)
      }
      return entry
    }
    for (const log of outboundLogs) {
      const d = new Date(log.createdAt)
      if (d.getFullYear() === year && d.getMonth() === month) {
        ensure(d.getDate()).sent.push(log)
      }
    }
    for (const info of curatedInfos) {
      if (info.status !== "scheduled" || !info.scheduledAt) continue
      const d = new Date(info.scheduledAt)
      if (d.getFullYear() === year && d.getMonth() === month) {
        ensure(d.getDate()).scheduled.push(info)
      }
    }
    return map
  }, [outboundLogs, curatedInfos, year, month])

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const monthLabel = viewDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  const selectedActivity = selectedDay !== null ? activityByDay.get(selectedDay) : undefined

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0 text-capitalize">{monthLabel}</h5>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Bulan sebelumnya"
            >
              <i className="bi bi-chevron-left" />
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Bulan berikutnya"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />
            const activity = activityByDay.get(day)
            const hasActivity = !!activity && (activity.sent.length > 0 || activity.scheduled.length > 0)
            const isToday = isCurrentMonth && today.getDate() === day
            return (
              <button
                key={day}
                type="button"
                className={`calendar-day${isToday ? " calendar-day-today" : ""}${hasActivity ? " calendar-day-active" : ""}`}
                onClick={() => hasActivity && setSelectedDay(day)}
                disabled={!hasActivity}
              >
                <span>{day}</span>
                {hasActivity && (
                  <span className="calendar-day-dots">
                    {activity!.sent.length > 0 && <span className="calendar-dot calendar-dot-sent" />}
                    {activity!.scheduled.length > 0 && <span className="calendar-dot calendar-dot-scheduled" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="d-flex gap-3 mt-3 small text-muted">
          <span className="d-inline-flex align-items-center gap-1">
            <span className="calendar-dot calendar-dot-sent" /> Pesan terkirim
          </span>
          <span className="d-inline-flex align-items-center gap-1">
            <span className="calendar-dot calendar-dot-scheduled" /> Terjadwal
          </span>
        </div>
      </div>

      {selectedDay !== null && selectedActivity && (
        <Modal title={`Aktivitas ${selectedDay} ${monthLabel}`} onClose={() => setSelectedDay(null)}>
          {selectedActivity.sent.length > 0 && (
            <div className="mb-3">
              <div className="text-muted small mb-2 text-uppercase fw-semibold">
                Pesan terkirim ({selectedActivity.sent.length})
              </div>
              {selectedActivity.sent.map((log) => (
                <div key={log._id} className="d-flex gap-2 align-items-start mb-2 pb-2 border-bottom">
                  <span className={`badge rounded-pill ${log.ok ? "badge-soft-green" : "badge-soft-red"}`}>
                    {log.ok ? "Terkirim" : "Gagal"}
                  </span>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="small text-muted">
                      {log.toJid} · {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                    </div>
                    <div className="text-truncate">
                      {log.text || <em className="text-muted">(tanpa teks)</em>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedActivity.scheduled.length > 0 && (
            <div>
              <div className="text-muted small mb-2 text-uppercase fw-semibold">
                Terjadwal ({selectedActivity.scheduled.length})
              </div>
              {selectedActivity.scheduled.map((info) => (
                <div key={info._id} className="d-flex gap-2 align-items-start mb-2 pb-2 border-bottom">
                  <span className="badge badge-soft-amber rounded-pill">{info.type}</span>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="small text-muted">
                      {info.scheduledAt && new Date(info.scheduledAt).toLocaleTimeString("id-ID")} ·{" "}
                      {info.targets.length} penerima
                    </div>
                    <div>{info.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export function Dashboard() {
  const { connected, qr: liveQr, disconnectReason, device } = useOutletContext<OutletCtx>()
  const [status, setStatus] = useState<Status | null>(null)
  const [latestSentiment, setLatestSentiment] = useState<Sentiment | null>(null)
  const [peakHours, setPeakHours] = useState<PeakHourRow[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [curatedInfos, setCuratedInfos] = useState<CuratedInfo[]>([])
  const [activeAgendas, setActiveAgendas] = useState<Agenda[]>([])
  const [openSpamAlerts, setOpenSpamAlerts] = useState<SpamAlert[]>([])
  const [newIdeas, setNewIdeas] = useState<AnonymousIdea[]>([])
  const [outboundLogs, setOutboundLogs] = useState<OutboundLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [manualQr, setManualQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  const qr = liveQr || manualQr
  const username = getStoredUsername() || "Admin"

  const fetchQr = useCallback(async () => {
    setQrLoading(true)
    try {
      const res = await api.qr()
      if (res.qr) setManualQr(res.qr)
    } catch {
      // Live SSE connection covers most cases; a failed manual refresh isn't fatal.
    } finally {
      setQrLoading(false)
    }
  }, [])

  useEffect(() => {
    if (connected) {
      setManualQr(null)
    } else if (connected === false && !liveQr) {
      fetchQr()
    }
  }, [connected, liveQr, fetchQr])

  useEffect(() => {
    let mounted = true
    api
      .status()
      .then((s) => {
        if (mounted) setStatus(s)
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      })
    api
      .sentiments()
      .then((res) => {
        if (mounted) setLatestSentiment(res.sentiments[0] ?? null)
      })
      .catch(() => {})
    api
      .peakHours()
      .then((res) => {
        if (mounted) setPeakHours(res.rows)
      })
      .catch(() => {})
    api
      .groups()
      .then((res) => {
        if (mounted) setGroups(res.groups)
      })
      .catch(() => {})
    api
      .curatedInfos()
      .then((res) => {
        if (mounted) setCuratedInfos(res.curatedInfos)
      })
      .catch(() => {})
    api
      .agendas(true)
      .then((res) => {
        if (mounted) setActiveAgendas(res.agendas)
      })
      .catch(() => {})
    api
      .spamAlerts("open")
      .then((res) => {
        if (mounted) setOpenSpamAlerts(res.alerts)
      })
      .catch(() => {})
    api
      .anonymousIdeas("new")
      .then((res) => {
        if (mounted) setNewIdeas(res.ideas)
      })
      .catch(() => {})
    api
      .outboundLogs(200)
      .then((res) => {
        if (mounted) setOutboundLogs(res.logs)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const isConnected = connected ?? status?.connected ?? false
  const deviceInfo = device ?? status?.device ?? null

  const draftOrScheduledCount = curatedInfos.filter(
    (i) => i.status === "draft" || i.status === "scheduled",
  ).length
  const unreviewedGroupCount = groups.filter((g) => g.scope === null).length
  const scopeCounts: ScopeCounts = {
    pusat: groups.filter((g) => g.scope === "pusat").length,
    dusun: groups.filter((g) => g.scope === "dusun").length,
    anggota: groups.filter((g) => g.scope === "anggota").length,
    unreviewed: unreviewedGroupCount,
  }

  const quickLinks: { to: string; icon: string; label: string; accent: string; badge?: QuickLinkBadge }[] = [
    {
      to: "/informasi-baru",
      icon: "bi-megaphone",
      label: "Kelola Pesan",
      accent: "#1e3a5f",
      badge: draftOrScheduledCount > 0 ? { text: `${draftOrScheduledCount} draft`, tone: "amber" } : undefined,
    },
    {
      to: "/pengingat-agenda",
      icon: "bi-calendar-event",
      label: "Pengingat Agenda",
      accent: "#1e3a5f",
      badge: activeAgendas.length > 0 ? { text: `${activeAgendas.length} aktif`, tone: "amber" } : undefined,
    },
    {
      to: "/spam-alerts",
      icon: "bi-shield-exclamation",
      label: "Spam Alert",
      accent: "#dc2626",
      badge: openSpamAlerts.length > 0 ? { text: `${openSpamAlerts.length} baru`, tone: "red" } : undefined,
    },
    {
      to: "/antrian-ide",
      icon: "bi-lightbulb",
      label: "Antrian Ide",
      accent: "#d97706",
      badge: newIdeas.length > 0 ? { text: `${newIdeas.length} baru`, tone: "amber" } : undefined,
    },
    {
      to: "/groups",
      icon: "bi-people",
      label: "Groups",
      accent: "#1e3a5f",
      badge: unreviewedGroupCount > 0 ? { text: `${unreviewedGroupCount} baru`, tone: "amber" } : undefined,
    },
    { to: "/infografis", icon: "bi-bar-chart", label: "Infografis", accent: "#1e3a5f" },
  ]

  const statMax = Math.max(1, status?.messageCount ?? 0, status?.summaryCount ?? 0, status?.participantCount ?? 0)

  return (
    <div>
      <PageHeader
        eyebrow="Ringkasan"
        color={NAV_COLORS.dashboard}
        title={`${greetingLabel(new Date())}, ${capitalizeWords(username)}!`}
        subtitle="Berikut ringkasan aktivitas bot WhatsApp Karang Taruna hari ini."
        action={<ChatIllustration className="dashboard-illustration d-none d-md-block" />}
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="d-flex flex-column flex-xl-row gap-3 mb-4 align-items-stretch">
        <div
          className="flex-shrink-0"
          style={isConnected && status ? { flexBasis: "38%", minWidth: 0 } : { width: "100%" }}
        >
          <div className="card h-100">
            <div className="card-body">
              {isConnected ? (
                <div className="d-flex align-items-start gap-3 flex-wrap">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{ width: 48, height: 48, backgroundColor: "color-mix(in srgb, #16a34a 15%, white)", color: "#166534" }}
                  >
                    <i className="bi bi-whatsapp fs-4" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h5 className="card-title mb-2">
                      <span className="badge badge-soft-green me-2 d-inline-flex align-items-center gap-2">
                        <span className="live-dot" />
                        Connected
                      </span>
                      Bot terhubung ke WhatsApp
                    </h5>
                    <p className="text-muted mb-1 small">
                      {deviceInfo ? (
                        <>
                          Perangkat: <strong>{formatWaNumber(deviceInfo.id)}</strong>
                          {deviceInfo.name ? ` (${deviceInfo.name})` : ""}
                          {" · "}
                          <i className={`bi ${describePlatform(deviceInfo.platform).icon} me-1`} />
                          {describePlatform(deviceInfo.platform).label}
                        </>
                      ) : (
                        "Info perangkat belum tersedia."
                      )}
                    </p>
                    <p className="text-muted mb-0" style={{ fontSize: "0.72rem" }}>
                      WhatsApp cuma membagikan jenis OS HP yang terpasang, bukan model spesifiknya —
                      perangkat utama akun WA selalu berupa HP, bukan laptop/PC.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h5 className="card-title">Scan untuk login bot</h5>
                  <p className="text-muted small">
                    Buka WhatsApp di HP → Setelan → Perangkat Tertaut → Tautkan Perangkat → scan QR di
                    bawah.
                  </p>
                  {disconnectReason && (
                    <p className="text-danger small mb-3">
                      {REASON_LABEL[disconnectReason] ?? disconnectReason}
                    </p>
                  )}
                  <div
                    className="d-flex justify-content-center align-items-center my-3"
                    style={{ minHeight: "220px" }}
                  >
                    {qr ? (
                      <QRCodeSVG value={qr} size={220} />
                    ) : (
                      <p className="text-muted">{qrLoading ? "Loading QR…" : "Menunggu QR…"}</p>
                    )}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={fetchQr} disabled={qrLoading}>
                    <i className="bi bi-arrow-clockwise me-1" />
                    {qrLoading ? "Refreshing…" : "Refresh QR"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isConnected && status && (
          <div className="d-flex flex-column flex-sm-row gap-3 flex-grow-1" style={{ minWidth: 0 }}>
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <StatCard
                icon="bi-chat-dots"
                label="Messages"
                subtitle="Total pesan masuk tercatat"
                value={status.messageCount}
                color="#1e3a5f"
                fraction={status.messageCount / statMax}
                pillText={`${status.messageCount} pesan`}
              />
            </div>
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <StatCard
                icon="bi-journal-text"
                label="Summaries"
                subtitle="Ringkasan harian dibuat"
                value={status.summaryCount}
                color="#1e3a5f"
                fraction={status.summaryCount / statMax}
                pillText={`${status.summaryCount} ringkasan`}
              />
            </div>
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <StatCard
                icon="bi-people"
                label="Participants"
                subtitle="Kontak aktif terekam"
                value={status.participantCount}
                color="#1e3a5f"
                fraction={status.participantCount / statMax}
                pillText={`${status.participantCount} kontak`}
              />
            </div>
          </div>
        )}
      </div>

      {!status && !error && <p className="text-muted">Loading status…</p>}
      {status && (
        <>
          <div className="d-flex flex-column flex-lg-row gap-3 mb-4 align-items-stretch">
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <MiniPeakHoursChart rows={peakHours} />
            </div>
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <div className="card h-100">
                <div className="card-body d-flex align-items-center gap-3 flex-wrap">
                  <BroadcastIllustration className="dashboard-illustration flex-shrink-0" />
                  <div style={{ minWidth: 0 }}>
                    <h5 className="card-title">
                      <i className="bi bi-info-circle me-2" />
                      Getting started
                    </h5>
                    <p className="card-text mb-0">
                      Pair this server with a disposable WhatsApp test number. Use the{" "}
                      <strong>Send</strong> page to send messages, <strong>Messages</strong> to review
                      inbound chat, and <strong>Digest</strong> to generate daily summaries.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-column flex-lg-row gap-3 mb-4 align-items-stretch justify-content-lg-between">
            <div className="flex-shrink-0 mx-auto mx-lg-0 dashboard-tri-card">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">Menu Cepat</h5>
                  </div>
                  <div className="quick-link-grid">
                    {quickLinks.map((q) => (
                      <QuickLinkTile key={q.to} {...q} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mx-auto mx-lg-0 dashboard-tri-card">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">Distribusi Grup</h5>
                  <GroupsDonut counts={scopeCounts} />
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mx-auto mx-lg-0 dashboard-tri-card">
              <ActivityCalendar outboundLogs={outboundLogs} curatedInfos={curatedInfos} />
            </div>
          </div>

          {latestSentiment && (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Sentiment Harian Pusat</h5>
                <p className="text-muted small">
                  {new Date(latestSentiment.periodStart).toLocaleDateString()} ·{" "}
                  {latestSentiment.messageCount} pesan
                </p>
                <div className="markdown-body">
                  <pre className="bg-body-tertiary p-3 rounded">{latestSentiment.bodyMd}</pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

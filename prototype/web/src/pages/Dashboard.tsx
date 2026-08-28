import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import {
  RefreshCw,
  Smartphone,
  Radio,
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Send,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from "lucide-react"
import {
  api,
  getStoredUsername,
  type Status,
  type WaDevice,
  type PeakHourRow,
  type GroupActivityRow,
  type Group,
  type CuratedInfo,
  type OutboundLog,
} from "../api.js"

type OutletCtx = {
  connected: boolean | null
  qr: string | null
  disconnectReason: string | null
  device: WaDevice | null
}

const REASON_LABEL: Record<string, string> = {
  loggedOut: "Logged out dari HP — hapus auth_session/ dan scan ulang QR.",
  disconnected: "Koneksi terputus — bridge akan mencoba menyambung ulang otomatis.",
}

function formatWaNumber(id: string): string {
  return `+${id.split(":")[0].split("@")[0]}`
}

function describePlatform(platform: string | null): string {
  if (!platform) return "Tidak diketahui"
  if (/android/i.test(platform)) return "Android"
  if (/iphone|ios|ipad/i.test(platform)) return "iPhone"
  return platform
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

const WEEKDAY_LABELS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"]
const GROUP_COLORS = ["#667714", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6", "#78716c", "#ec4899"]

type DayActivity = { sent: OutboundLog[]; scheduled: CuratedInfo[] }

export function Dashboard() {
  const navigate = useNavigate()
  const { connected, qr: liveQr, disconnectReason, device } = useOutletContext<OutletCtx>()
  const [status, setStatus] = useState<Status | null>(null)
  const [peakHours, setPeakHours] = useState<PeakHourRow[]>([])
  const [groupActivity, setGroupActivity] = useState<GroupActivityRow[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [curatedInfos, setCuratedInfos] = useState<CuratedInfo[]>([])
  const [outboundLogs, setOutboundLogs] = useState<OutboundLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [manualQr, setManualQr] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

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
    if (connected) setManualQr(null)
    else if (connected === false && !liveQr) fetchQr()
  }, [connected, liveQr, fetchQr])

  useEffect(() => {
    let mounted = true
    api.status().then((s) => mounted && setStatus(s)).catch((err) => mounted && setError(err instanceof Error ? err.message : String(err)))
    api.peakHours().then((res) => mounted && setPeakHours(res.rows)).catch(() => {})
    api.messagesByGroup().then((res) => mounted && setGroupActivity(res.rows)).catch(() => {})
    api.groups().then((res) => mounted && setGroups(res.groups)).catch(() => {})
    api.curatedInfos().then((res) => mounted && setCuratedInfos(res.curatedInfos)).catch(() => {})
    api.outboundLogs(200).then((res) => mounted && setOutboundLogs(res.logs)).catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const isConnected = connected ?? status?.connected ?? false
  const deviceInfo = device ?? status?.device ?? null

  const statMax = Math.max(1, status?.messageCount ?? 0, status?.summaryCount ?? 0, status?.participantCount ?? 0)

  const maxPeakCount = Math.max(1, ...peakHours.map((r) => r.count))
  const peakHour = peakHours.reduce((best, r) => (r.count > (best?.count ?? -1) ? r : best), null as PeakHourRow | null)
  const avgPerHour = peakHours.length > 0 ? Math.round(peakHours.reduce((s, r) => s + r.count, 0) / peakHours.length) : 0

  const recentLogs = useMemo(
    () => [...outboundLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [outboundLogs],
  )

  const groupsByActivity = useMemo(() => {
    const countByJid = new Map(groupActivity.map((r) => [r.chatJid, r.messageCount]))
    return [...groups]
      .map((g) => ({ group: g, messageCount: countByJid.get(g.waJid) ?? 0 }))
      .sort((a, b) => b.messageCount - a.messageCount)
  }, [groups, groupActivity])
  const totalGroupMessages = groupsByActivity.reduce((s, g) => s + g.messageCount, 0)

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
      if (d.getFullYear() === year && d.getMonth() === month) ensure(d.getDate()).sent.push(log)
    }
    for (const info of curatedInfos) {
      if (info.status !== "scheduled" || !info.scheduledAt) continue
      const d = new Date(info.scheduledAt)
      if (d.getFullYear() === year && d.getMonth() === month) ensure(d.getDate()).scheduled.push(info)
    }
    return map
  }, [outboundLogs, curatedInfos, year, month])

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const monthLabel = viewDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  const selectedActivity = selectedDay !== null ? activityByDay.get(selectedDay) : undefined

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {greetingLabel(new Date())}, {capitalizeWords(username)}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 font-normal">
            Ringkasan aktivitas bot WhatsApp Karang Taruna hari ini.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => navigate("/messages")}
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Kotak Masuk
          </button>
          <button
            onClick={() => navigate("/informasi-baru")}
            className="bg-white hover:bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            KIRIM BROADCAST
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {/* Bot connection card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Status Bridge WhatsApp</h2>
              <p className="text-xs text-slate-500">Baileys multi-device protocol bridge</p>
            </div>
          </div>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CONNECTED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
              DISCONNECTED
            </span>
          )}
        </div>

        {isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perangkat Terhubung</span>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="truncate">{deviceInfo?.name || "—"}</span>
              </div>
              <span className="text-[10px] text-slate-500 block font-mono">
                Platform: {describePlatform(deviceInfo?.platform ?? null)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Bot WhatsApp</span>
              <div className="text-blue-600 font-mono font-bold text-sm">
                {deviceInfo ? formatWaNumber(deviceInfo.id) : "—"}
              </div>
              <span className="text-[10px] text-emerald-600 block font-medium">✓ Terverifikasi Karang Taruna</span>
            </div>
            <div className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Untuk memutus/mengganti perangkat, hapus <code className="text-[11px]">auth_session/</code> di server
                lalu scan ulang.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="relative p-3 bg-white rounded-2xl shadow-md shrink-0 flex flex-col items-center border border-slate-200">
              <div className="w-44 h-44 flex items-center justify-center rounded-lg overflow-hidden">
                {qr ? (
                  <QRCodeSVG value={qr} size={176} />
                ) : (
                  <p className="text-slate-400 text-xs text-center px-2">
                    {qrLoading ? "Memuat QR…" : "Menunggu QR…"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Cara Menautkan WhatsApp Bot:</h3>
              <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed font-medium">
                <li>
                  Buka aplikasi <strong>WhatsApp</strong> di ponsel administrator.
                </li>
                <li>
                  Ketuk <strong>Setelan</strong> → pilih <strong className="text-blue-600">Perangkat Tertaut</strong>.
                </li>
                <li>
                  Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera ke kode QR di samping.
                </li>
              </ol>
              {disconnectReason && (
                <p className="text-xs text-rose-600 font-medium">{REASON_LABEL[disconnectReason] ?? disconnectReason}</p>
              )}
              <button
                onClick={fetchQr}
                disabled={qrLoading}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${qrLoading ? "animate-spin" : ""}`} />
                Refresh QR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real stat cards */}
      {isConnected && status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            icon={MessageSquare}
            iconBg="bg-blue-50 border-blue-200 text-blue-600"
            label="Total Pesan Masuk"
            value={status.messageCount}
            fraction={status.messageCount / statMax}
            barColor="bg-blue-600"
            note="pesan tercatat"
          />
          <StatCard
            icon={FileText}
            iconBg="bg-blue-50 border-blue-200 text-blue-600"
            label="Ringkasan AI Dibuat"
            value={status.summaryCount}
            fraction={status.summaryCount / statMax}
            barColor="bg-blue-600"
            note="ringkasan harian"
          />
          <StatCard
            icon={Users}
            iconBg="bg-emerald-50 border-emerald-200 text-emerald-600"
            label="Kontak Aktif"
            value={status.participantCount}
            fraction={status.participantCount / statMax}
            barColor="bg-emerald-500"
            note={`${groups.length} grup terpetakan`}
          />
        </div>
      )}

      {/* Traffic + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Peak Chat Hours</h3>
              <p className="text-xs text-slate-500">Distribusi pesan per jam, 24 jam terakhir</p>
            </div>
            <button
              onClick={() => navigate("/infografis")}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
            >
              LIHAT DETAIL
            </button>
          </div>

          {peakHours.length === 0 ? (
            <p className="text-slate-400 text-sm">Belum ada data pesan.</p>
          ) : (
            <>
              <div className="flex-1 flex items-end gap-1 sm:gap-2 px-1 h-48 border-b border-slate-100 pb-3">
                {Array.from({ length: 24 }, (_, hour) => {
                  const row = peakHours.find((r) => r.hour === hour)
                  const count = row?.count ?? 0
                  const heightPercent = Math.max(Math.round((count / maxPeakCount) * 100), count > 0 ? 4 : 0)
                  const isPeak = count > maxPeakCount * 0.7
                  const isHigh = count > maxPeakCount * 0.4 && count <= maxPeakCount * 0.7
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                      <div className="absolute -top-8 hidden group-hover:flex px-2 py-1 bg-slate-900 text-[10px] text-white rounded font-mono shadow-md z-20 whitespace-nowrap">
                        {hour}:00 — {count} pesan
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[24px] rounded-t-lg transition-all duration-300 ${
                          isPeak ? "bg-blue-600" : isHigh ? "bg-blue-400 group-hover:bg-blue-500" : "bg-slate-200 group-hover:bg-slate-300"
                        }`}
                      />
                      <span className="text-[9px] text-slate-400 font-mono">{hour}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                  Jam puncak:{" "}
                  <strong className="text-slate-900 font-mono">
                    {peakHour ? `${peakHour.hour}:00 WIB` : "—"}
                  </strong>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Rata-rata: {avgPerHour} pesan/jam</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-sm flex items-center gap-2 text-slate-900">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Aktivitas Terbaru
              </h3>
            </div>
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada pesan terkirim.</p>
            ) : (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-3">
                    <div
                      className={`text-[10px] font-mono font-bold mt-0.5 shrink-0 ${log.ok ? "text-blue-600" : "text-rose-600"}`}
                    >
                      {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${log.ok ? "text-slate-900" : "text-rose-700"}`}>
                        {log.ok ? "Pesan Terkirim" : "Pengiriman Gagal"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {log.toJid} {log.text ? `· ${log.text.slice(0, 40)}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={() => navigate("/messages")}
              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold transition-colors cursor-pointer"
              title="Lihat Log Pesan"
            >
              ↗
            </button>
          </div>
        </div>
      </div>

      {/* Calendar + sentiment + group distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Kalender Aktivitas</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 capitalize min-w-[100px] text-center">{monthLabel}</span>
              <button
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1 font-mono">
              {WEEKDAY_LABELS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }, (_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const activity = activityByDay.get(day)
                const hasActivity = !!activity && (activity.sent.length > 0 || activity.scheduled.length > 0)
                const isToday = isCurrentMonth && today.getDate() === day
                return (
                  <button
                    key={day}
                    onClick={() => hasActivity && setSelectedDay(day)}
                    disabled={!hasActivity}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center relative text-xs font-semibold transition-all ${
                      isToday
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25"
                        : hasActivity
                          ? "text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                          : "text-slate-400"
                    }`}
                  >
                    <span>{day}</span>
                    {hasActivity && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isToday ? "bg-white" : "bg-blue-600"}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">* Klik tanggal untuk melihat pesan & agenda terjadwal.</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Distribusi Grup</h3>
            </div>
            <button onClick={() => navigate("/groups")} className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer">
              Kelola Grup
            </button>
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {totalGroupMessages === 0 ? (
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e7e6e4" strokeWidth="3.5" />
                ) : (
                  groupsByActivity.map(({ group: g, messageCount }, i) => {
                    if (messageCount === 0) return null
                    const pct = (messageCount / totalGroupMessages) * 100
                    const priorPct = groupsByActivity.slice(0, i).reduce((s, x) => s + (x.messageCount / totalGroupMessages) * 100, 0)
                    return (
                      <circle
                        key={g._id}
                        cx="18" cy="18" r="15.915" fill="transparent"
                        stroke={GROUP_COLORS[i % GROUP_COLORS.length]}
                        strokeWidth="3.5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={`-${priorPct}`}
                      >
                        <title>{`${g.name || g.waJid}: ${messageCount}`}</title>
                      </circle>
                    )
                  })
                )}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-slate-900 font-mono">{groups.length}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Grup</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {groupsByActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Bot belum tergabung di grup manapun.</p>
            ) : (
              groupsByActivity.map(({ group: g, messageCount }, i) => (
                <div key={g._id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }} />
                    <span className="font-medium text-slate-700 truncate">{g.name || g.waJid}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 shrink-0">{messageCount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedDay !== null && selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDay(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Aktivitas {selectedDay} {monthLabel}
                </h3>
                <p className="text-xs text-slate-500">Pesan terkirim & agenda terjadwal hari ini</p>
              </div>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {selectedActivity.sent.map((log) => (
                <div key={log._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${log.ok ? "text-blue-600" : "text-rose-600"}`}>
                      {log.ok ? "Terkirim" : "Gagal"} · {log.toJid}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">
                      {new Date(log.createdAt).toLocaleTimeString("id-ID")}
                    </span>
                  </div>
                  {log.text && <p className="text-xs text-slate-600 truncate">{log.text}</p>}
                </div>
              ))}
              {selectedActivity.scheduled.map((info) => (
                <div key={info._id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-600">{info.title}</span>
                    <span className="text-[10px] text-emerald-600 font-bold font-mono">
                      {info.scheduledAt && new Date(info.scheduledAt).toLocaleTimeString("id-ID")}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">{info.targets.length} penerima</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  fraction,
  barColor,
  note,
}: {
  icon: typeof MessageSquare
  iconBg: string
  label: string
  value: number
  fraction: number
  barColor: string
  note: string
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-xl border ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{value}</span>
        <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> {note}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round(Math.min(fraction, 1) * 100)}%` }} />
      </div>
    </div>
  )
}

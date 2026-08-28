import { useEffect, useState } from "react"
import { ShieldAlert, CheckCircle2, XCircle, Clock, User, Users, Search } from "lucide-react"
import { api, type SpamAlert, type SpamAlertStatus } from "../api.js"

const FILTERS: { value: SpamAlertStatus | "all"; label: string }[] = [
  { value: "open", label: "Baru" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "dismissed", label: "Bukan Spam" },
  { value: "all", label: "Semua" },
]

function scoreColor(score: number) {
  if (score >= 80) return "bg-rose-50 text-rose-700 border-rose-200"
  if (score >= 65) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-yellow-50 text-yellow-700 border-yellow-200"
}

export function SpamAlerts() {
  const [alerts, setAlerts] = useState<SpamAlert[]>([])
  const [filter, setFilter] = useState<SpamAlertStatus | "all">("open")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.spamAlerts(filter === "all" ? undefined : filter)
      setAlerts(res.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const setStatus = async (id: string, status: SpamAlertStatus) => {
    setBusyId(id)
    setError(null)
    try {
      await api.setSpamAlertStatus(id, status)
      setAlerts((prev) => prev.filter((a) => a._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredAlerts = q
    ? alerts.filter((a) => a.text.toLowerCase().includes(q) || a.fromJid.toLowerCase().includes(q) || a.chatJid.toLowerCase().includes(q))
    : alerts
  const countNew = alerts.filter((a) => a.status === "open").length

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Spam / Fraud Alert</span>
            {filter === "open" && countNew > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md animate-pulse">
                {countNew} Perlu Ditinjau
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pesan yang lolos heuristik spam-fraud (skor ≥ 50) — otomatis dikirim ke Pusat lewat WA.
          </p>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === f.value ? "bg-rose-600 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari isi pesan / nomor pengirim…"
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-8">Memuat…</p>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500 space-y-2">
            <ShieldAlert className="w-10 h-10 mx-auto opacity-30 text-emerald-600" />
            <p className="font-bold text-slate-800">
              {filter === "open" ? "Tidak ada alert baru — aman." : "Tidak ada data untuk filter ini."}
            </p>
          </div>
        ) : (
          filteredAlerts.map((a) => (
            <div key={a._id} className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-md shadow-xs space-y-4 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-xl text-xs font-mono font-extrabold border ${scoreColor(a.spamScore)}`}>
                    Skor: {a.spamScore}/100
                  </div>
                  {a.notified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Terkirim ke Pusat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(a.createdAt).toLocaleString("id-ID")}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-600" />
                    Dari: <strong className="text-slate-900 font-mono">{a.fromJid}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Chat: <strong className="text-slate-900 font-mono">{a.chatJid}</strong>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                  {a.text}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Indikasi:</span>
                  {a.reasons.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      • {r}
                    </span>
                  ))}
                </div>
              </div>

              {a.status === "open" ? (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => setStatus(a._id, "dismissed")}
                    disabled={busyId === a._id}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bukan Spam
                  </button>
                  <button
                    onClick={() => setStatus(a._id, "confirmed")}
                    disabled={busyId === a._id}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Konfirmasi Spam
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Status:</span>
                  {a.status === "confirmed" ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Dikonfirmasi spam</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Bukan spam</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

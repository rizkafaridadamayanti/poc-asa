import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FileText,
  Sparkles,
  Search,
  Star,
  Download,
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
  Eye,
  X,
} from "lucide-react"
import { api, type Group, type Summary } from "../api.js"
import { ConfirmModal } from "../components/ConfirmModal.js"
import { AiChatPanel } from "../components/AiChatPanel.js"

type DigestResult = { summaryId: string; bodyMd: string; messageCount: number; waMessageId?: string }
type ViewMode = "active" | "trash"

export function Summaries() {
  const [viewMode, setViewMode] = useState<ViewMode>("active")
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const limit = 10

  const [groups, setGroups] = useState<Group[]>([])
  const [groupFilter, setGroupFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [keywordFilter, setKeywordFilter] = useState("")

  const [digestLoading, setDigestLoading] = useState(false)
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null)

  const [viewingSummary, setViewingSummary] = useState<Summary | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.summaries(
        limit,
        newOffset,
        { groupJid: groupFilter || undefined, from: fromFilter || undefined, to: toFilter || undefined, keyword: keywordFilter || undefined },
        viewMode === "trash",
      )
      setSummaries(res.summaries)
      setTotal(res.total)
      setOffset(res.offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  useEffect(() => {
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
  }, [])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    load(0)
  }

  const switchView = (mode: ViewMode) => {
    setViewMode(mode)
    setInfo(null)
    setError(null)
  }

  const runDigest = async (last24h: boolean) => {
    setDigestLoading(true)
    setError(null)
    setDigestResult(null)
    try {
      const res = await api.digest(last24h)
      setDigestResult(res)
      if (viewMode === "active") await load(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDigestLoading(false)
    }
  }

  const toggle = async (s: Summary, field: "read" | "important" | "trash") => {
    try {
      await api.updateSummary(s._id, { [field]: !s[field] })
      if (field === "trash") {
        setSummaries((prev) => prev.filter((x) => x._id !== s._id))
        setTotal((t) => Math.max(t - 1, 0))
        setInfo(viewMode === "active" ? "Ringkasan dipindahkan ke Riwayat." : "Ringkasan dipulihkan.")
      } else {
        await load(offset)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeletePermanent = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.deleteSummaryPermanent(id)
      setSummaries((prev) => prev.filter((s) => s._id !== id))
      setTotal((t) => Math.max(t - 1, 0))
      setInfo("Ringkasan dihapus permanen.")
      setConfirmingDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const exportDocx = async (s: Summary) => {
    try {
      const blob = await api.exportSummary(s._id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `summary-${s._id}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const groupName = (jid: string) => groups.find((g) => g.waJid === jid)?.name || jid

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Summaries</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              AI Digest
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Ringkasan harian chat WhatsApp yang dibuat otomatis oleh AI.</p>
        </div>
        <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center shrink-0">
          <button
            onClick={() => switchView("active")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "active" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ringkasan Aktif{viewMode === "active" ? ` (${total})` : ""}
          </button>
          <button
            onClick={() => switchView("trash")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "trash" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Riwayat{viewMode === "trash" ? ` (${total})` : ""}
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {info && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{info}</div>}

      <form
        onSubmit={applyFilters}
        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Group</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 font-medium cursor-pointer"
          >
            <option value="">Semua grup</option>
            {groups.map((g) => (
              <option key={g._id} value={g.waJid}>
                {g.name || g.waJid}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Dari</label>
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 font-medium"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Sampai</label>
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 font-medium"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Kata kunci</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="cari isi ringkasan…"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>
        </div>
        <button
          disabled={loading}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
        >
          Terapkan Filter
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Memuat…</p>
          ) : summaries.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-30 text-blue-600" />
              <p className="font-bold text-slate-800">
                {viewMode === "trash" ? "Riwayat kosong." : "Belum ada ringkasan."}
              </p>
              <p className="text-xs text-slate-500">Gunakan Run Digest di samping untuk membuat ringkasan on-demand.</p>
            </div>
          ) : (
            summaries.map((s) => (
              <div
                key={s._id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md shadow-xs space-y-3 transition-all group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-slate-700">
                      {new Date(s.periodStart).toLocaleDateString("id-ID")} — {new Date(s.periodEnd).toLocaleDateString("id-ID")}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-600 font-mono font-bold">{s.sourceMessageIds.length} pesan sumber</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode === "active" && (
                      <button
                        onClick={() => toggle(s, "important")}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          s.important ? "bg-amber-50 border-amber-300 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
                        }`}
                        title={s.important ? "Ditandai penting" : "Tandai penting"}
                      >
                        <Star className={`w-3.5 h-3.5 ${s.important ? "fill-amber-500" : ""}`} />
                      </button>
                    )}
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                      {groupName(s.sourceGroupJid)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium markdown-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.bodyMd}</ReactMarkdown>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingSummary(s)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Detail
                    </button>
                    <button
                      onClick={() => exportDocx(s)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export .docx</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {viewMode === "active" ? (
                      <button
                        onClick={() => toggle(s, "trash")}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Pindahkan ke Riwayat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggle(s, "trash")}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Pulihkan"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(s._id)}
                          disabled={busyId === s._id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          title="Hapus permanen"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {summaries.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={offset === 0 || loading}
                onClick={() => load(Math.max(offset - limit, 0))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-mono">
                {offset + 1}–{Math.min(offset + summaries.length, total)} dari {total}
              </span>
              <button
                disabled={offset + summaries.length >= total || loading}
                onClick={() => load(offset + limit)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:pb-1">
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Run Digest On-Demand</h3>
                <p className="text-[11px] text-slate-500">Hasil dikirim ke WhatsApp REPORT_TO_JID</p>
              </div>
            </div>
            {digestResult && (
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                Digest dibuat ({digestResult.messageCount} pesan). WA message ID: {digestResult.waMessageId ?? "n/a"}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={digestLoading}
                onClick={() => runDigest(false)}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                {digestLoading ? "Menjalankan…" : "Run Yesterday"}
              </button>
              <button
                disabled={digestLoading}
                onClick={() => runDigest(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Run Last 24h
              </button>
            </div>
          </div>

          <AiChatPanel groups={groups} />
        </div>
      </div>

      {viewingSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
          onClick={() => setViewingSummary(null)}
        >
          <div
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-slate-900 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingSummary(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                    {groupName(viewingSummary.sourceGroupJid)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{viewingSummary.sourceMessageIds.length} pesan dianalisis</span>
                  {viewingSummary.read && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">Read</span>}
                  {viewingSummary.important && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200">Important</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {new Date(viewingSummary.periodStart).toLocaleString("id-ID")} — {new Date(viewingSummary.periodEnd).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingSummary.bodyMd}</ReactMarkdown>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => exportDocx(viewingSummary)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export .docx
              </button>
              <button
                onClick={() => setViewingSummary(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={() => confirmingDeleteId && handleDeletePermanent(confirmingDeleteId)}
        busy={busyId === confirmingDeleteId}
        title="Hapus permanen?"
        description="Ringkasan ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, hapus permanen"
        type="danger"
      />
    </div>
  )
}

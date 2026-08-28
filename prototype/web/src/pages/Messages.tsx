import { useEffect, useMemo, useState } from "react"
import { useOutletContext } from "react-router-dom"
import {
  Search,
  Trash2,
  RotateCcw,
  Eye,
  X,
  MessageSquare,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { api, type Group, type Message } from "../api.js"
import { ConfirmModal } from "../components/ConfirmModal.js"
import { MediaPreview } from "../components/MediaPreview.js"
import { MediaTypeBadge, truncateWords } from "../messageUtils.js"

type ViewMode = "active" | "trash"

export function Messages() {
  const { lastInbound } = useOutletContext<{ lastInbound: Record<string, unknown> | null }>()
  const [viewMode, setViewMode] = useState<ViewMode>("active")
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [chatFilter, setChatFilter] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const limit = 20

  const [viewingMessage, setViewingMessage] = useState<Message | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const load = async (newOffset: number, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    if (!opts.silent) setError(null)
    try {
      const res = await api.messages(limit, newOffset, chatFilter || undefined, debouncedSearch || undefined, viewMode === "trash")
      setMessages(res.messages)
      setTotal(res.total)
      setOffset(res.offset)
    } catch (err) {
      if (!opts.silent) setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFilter, debouncedSearch, viewMode])

  useEffect(() => {
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
  }, [])

  // For personal (DM) messages: which of the bot's known groups is this sender
  // also a member of, per the participant roster pulled from WhatsApp on Sync.
  const groupsByParticipant = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const g of groups) {
      for (const jid of g.participants ?? []) {
        const list = map.get(jid)
        const label = g.name || g.waJid
        if (list) list.push(label)
        else map.set(jid, [label])
      }
    }
    return map
  }, [groups])

  useEffect(() => {
    if (!lastInbound || viewMode !== "active") return
    const msg = lastInbound as unknown as Message
    if (chatFilter && msg.chatJid !== chatFilter) return
    setMessages((prev) => {
      if (prev.some((m) => m.messageId === msg.messageId)) return prev
      const group = groups.find((g) => g.waJid === msg.chatJid)
      return [{ ...msg, chatName: group?.name || null }, ...prev]
    })
    setTotal((t) => t + 1)
    if (offset === 0) {
      const t = setTimeout(() => load(0, { silent: true }), 800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInbound])

  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const hasFilters = chatFilter !== "" || search !== ""
  const clearFilters = () => {
    setChatFilter("")
    setSearch("")
  }
  const switchView = (mode: ViewMode) => {
    setViewMode(mode)
    setInfo(null)
    setError(null)
  }

  const handleTrash = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.trashMessage(id)
      setMessages((prev) => prev.filter((m) => m._id !== id))
      setTotal((t) => Math.max(t - 1, 0))
      setInfo("Pesan dipindahkan ke Riwayat.")
      setConfirmingDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleRestore = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.restoreMessage(id)
      setMessages((prev) => prev.filter((m) => m._id !== id))
      setTotal((t) => Math.max(t - 1, 0))
      setInfo("Pesan dipulihkan ke Messages.")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleDeletePermanent = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.deleteMessagePermanent(id)
      setMessages((prev) => prev.filter((m) => m._id !== id))
      setTotal((t) => Math.max(t - 1, 0))
      setInfo("Pesan dihapus permanen.")
      setConfirmingDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setError(null)
    try {
      if (viewMode === "active") {
        const res = await api.trashAllMessages()
        setMessages([])
        setTotal(0)
        setInfo(`Semua pesan aktif dipindahkan ke Riwayat (${res.trashedCount}).`)
      } else {
        const res = await api.resetMessages()
        setMessages([])
        setTotal(0)
        setInfo(`Semua pesan dihapus permanen (${res.deletedCount}).`)
      }
      setConfirmingReset(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setResetting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Messages</span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Live Stream
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring komunikasi masuk WhatsApp secara real-time dari grup & jalur personal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center">
            <button
              onClick={() => switchView("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "active" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pesan Aktif{viewMode === "active" ? ` (${total})` : ""}
            </button>
            <button
              onClick={() => switchView("trash")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "trash" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Riwayat{viewMode === "trash" ? ` (${total})` : ""}
            </button>
          </div>
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={total === 0}
            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Pesan</span>
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {info && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{info}</div>}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:w-72">
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Chat / Group</label>
          <select
            value={chatFilter}
            onChange={(e) => setChatFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 font-medium transition-colors cursor-pointer"
          >
            <option value="">Semua Chat &amp; Grup</option>
            {groups.map((g) => (
              <option key={g._id} value={g.waJid}>
                {g.name || g.waJid}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Cari Pesan</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari isi pesan atau pengirim…"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-colors font-medium"
            />
          </div>
        </div>
        <div className="w-full md:w-auto self-end">
          <button
            onClick={clearFilters}
            disabled={!hasFilters}
            className="w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer disabled:opacity-40"
          >
            Bersihkan Filter
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-32">{viewMode === "trash" ? "Dihapus" : "Waktu"}</th>
                <th className="py-3 px-4 w-40">Pengirim</th>
                <th className="py-3 px-4 w-28">Tipe</th>
                <th className="py-3 px-4 w-52">Chat / Group</th>
                <th className="py-3 px-4">Isi Pesan</th>
                <th className="py-3 px-4 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Memuat…</td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="w-8 h-8 opacity-40" />
                      <span className="font-bold text-slate-700">
                        {viewMode === "trash"
                          ? hasFilters ? "Tidak ada pesan di riwayat yang cocok." : "Riwayat kosong."
                          : hasFilters ? "Tidak ada pesan yang cocok." : "Belum ada pesan masuk."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m._id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {viewMode === "trash"
                        ? m.trashedAt
                          ? new Date(m.trashedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "—"
                        : formatTime(m.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 truncate max-w-[160px] font-mono text-[11px]">
                        {m.fromJid.split("@")[0]}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {m.isGroup ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> Grup
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> Personal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium text-xs truncate max-w-[190px]" title={m.chatName || m.chatJid}>
                        {m.chatName || m.chatJid}
                      </div>
                      {!m.isGroup && (groupsByParticipant.get(m.fromJid)?.length ?? 0) > 0 && (
                        <div className="text-[10px] text-emerald-600 truncate max-w-[190px]" title={groupsByParticipant.get(m.fromJid)!.join(", ")}>
                          Juga di: {groupsByParticipant.get(m.fromJid)!.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {m.type !== "text" && <MediaTypeBadge type={m.type} />}
                        <p className="line-clamp-2 text-slate-700 leading-relaxed text-xs">
                          {m.text ? truncateWords(m.text, 10, 90) : <em className="text-slate-400">(tanpa teks)</em>}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingMessage(m)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {viewMode === "active" ? (
                          <button
                            onClick={() => setConfirmingDeleteId(m._id)}
                            disabled={busyId === m._id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(m._id)}
                              disabled={busyId === m._id}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                              title="Pulihkan"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmingDeleteId(m._id)}
                              disabled={busyId === m._id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                              title="Hapus permanen"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{total > 0 ? offset + 1 : 0}</span>–
            <span className="font-bold text-slate-800">{Math.min(offset + messages.length, total)}</span> dari{" "}
            <span className="font-bold text-slate-800">{total}</span> pesan
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => load(Math.max(offset - limit, 0))}
              disabled={offset === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => load(offset + limit)}
              disabled={offset + messages.length >= total || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewingMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
          onClick={() => setViewingMessage(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingMessage(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Detail Pesan</h3>
                <p className="text-xs text-slate-400 font-mono">{formatTime(viewingMessage.timestamp)}</p>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Dari</span>
                  <span className="font-mono text-slate-800 text-[11px]">{viewingMessage.fromJid}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Chat</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {viewingMessage.isGroup ? viewingMessage.chatName || viewingMessage.chatJid : "Personal (DM)"}
                  </span>
                </div>
                {!viewingMessage.isGroup && (groupsByParticipant.get(viewingMessage.fromJid)?.length ?? 0) > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Juga anggota di</span>
                    <span className="text-emerald-600 font-medium text-xs">
                      {groupsByParticipant.get(viewingMessage.fromJid)!.join(", ")}
                    </span>
                  </div>
                )}
              </div>
              {viewingMessage.type !== "text" && viewingMessage.mediaFilename && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <MediaPreview
                    messageId={viewingMessage._id}
                    mediaType={viewingMessage.type}
                    mimetype={viewingMessage.mediaMimetype}
                  />
                </div>
              )}
              {viewingMessage.text && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    {viewingMessage.type !== "text" ? "Keterangan" : "Isi pesan"}
                  </span>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">{viewingMessage.text}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={() => confirmingDeleteId && (viewMode === "active" ? handleTrash(confirmingDeleteId) : handleDeletePermanent(confirmingDeleteId))}
        busy={busyId === confirmingDeleteId}
        title={viewMode === "active" ? "Hapus pesan?" : "Hapus permanen?"}
        description={
          viewMode === "active"
            ? "Pesan ini akan dipindahkan ke Riwayat. Kamu masih bisa menghapusnya permanen dari sana nanti."
            : "Pesan ini (dan berkas media-nya, jika ada) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        }
        confirmText={viewMode === "active" ? "Ya, hapus" : "Ya, hapus permanen"}
        type={viewMode === "active" ? "warning" : "danger"}
      />

      <ConfirmModal
        isOpen={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        onConfirm={handleReset}
        busy={resetting}
        title={viewMode === "active" ? "Pindahkan semua pesan aktif ke Riwayat?" : "Kosongkan semua Riwayat?"}
        description={
          viewMode === "active"
            ? "Semua pesan aktif akan dipindahkan ke Riwayat. Belum permanen — masih bisa dipulihkan dari sana."
            : "Semua pesan di Riwayat akan dihapus permanen, termasuk berkas medianya. Tindakan ini tidak bisa dibatalkan."
        }
        confirmText={viewMode === "active" ? "Ya, pindahkan" : "Ya, hapus semua"}
        type="danger"
      />
    </div>
  )
}

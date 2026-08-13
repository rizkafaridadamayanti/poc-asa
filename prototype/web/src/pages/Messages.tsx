import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { api, type Group, type Message } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { MediaPreview } from "../components/MediaPreview.js"
import { MEDIA_TYPE_INFO, MediaTypeBadge, truncateWords } from "../messageUtils.js"
import { NAV_COLORS } from "../navColors.js"
import { EmptyState } from "../components/EmptyState.js"

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
      const res = await api.messages(
        limit,
        newOffset,
        chatFilter || undefined,
        debouncedSearch || undefined,
        viewMode === "trash",
      )
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
    api
      .groups()
      .then((res) => setGroups(res.groups))
      .catch(() => {})
  }, [])

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
    // The SSE event fires straight from the WA bridge, before the message is
    // even written to Mongo — it has no real _id yet, so actions like "view
    // detail" (media fetch) or delete would 404/500 against it. Silently
    // reconcile with the DB shortly after so the row picks up its real _id
    // without the user needing to reload.
    if (offset === 0) {
      const t = setTimeout(() => load(0, { silent: true }), 800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInbound])

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString()
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

  const themeColor = viewMode === "trash" ? NAV_COLORS.riwayat : NAV_COLORS.messages
  const emptyText =
    viewMode === "trash"
      ? hasFilters
        ? "Tidak ada pesan di riwayat yang cocok dengan filter."
        : "Riwayat kosong."
      : hasFilters
        ? "Tidak ada pesan yang cocok dengan filter."
        : "No messages yet."

  return (
    <div>
      <PageHeader
        eyebrow={viewMode === "trash" ? "Riwayat" : "Pesan Masuk"}
        color={themeColor}
        title={viewMode === "trash" ? "Riwayat Pesan" : "Messages"}
        subtitle={
          viewMode === "trash"
            ? "Pesan yang dihapus dari Messages singgah di sini. Pulihkan, hapus permanen satu per satu, atau Reset semuanya."
            : undefined
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="segmented-tabs">
          <button
            type="button"
            className={`segmented-tab${viewMode === "active" ? " active" : ""}`}
            onClick={() => switchView("active")}
          >
            <i className="bi bi-inbox" />
            Pesan Aktif
          </button>
          <button
            type="button"
            className={`segmented-tab${viewMode === "trash" ? " active" : ""}`}
            onClick={() => switchView("trash")}
          >
            <i className="bi bi-clock-history" />
            Riwayat
          </button>
        </div>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => setConfirmingReset(true)}
          disabled={total === 0 && messages.length === 0}
        >
          <i className="bi bi-exclamation-triangle me-1" />
          Reset Semua Pesan
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="chatFilter" className="form-label">
                Chat / Group
              </label>
              <select
                id="chatFilter"
                className="form-select"
                value={chatFilter}
                onChange={(e) => setChatFilter(e.target.value)}
              >
                <option value="">All chats</option>
                {groups.map((g) => (
                  <option key={g._id} value={g.waJid}>
                    {g.name || g.waJid}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="search" className="form-label">
                Cari pesan
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  id="search"
                  type="search"
                  className="form-control"
                  placeholder="Cari isi pesan atau pengirim…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                <i className="bi bi-x-lg me-1" />
                Bersihkan
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && messages.length === 0 && <EmptyState icon="bi-inbox" text={emptyText} />}
      {messages.length > 0 && (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr style={{ "--bs-table-bg": `color-mix(in srgb, ${themeColor} 12%, white)` } as React.CSSProperties}>
                    <th className="text-nowrap text-center">{viewMode === "trash" ? "Dihapus" : "Time"}</th>
                    <th className="text-nowrap text-center">From</th>
                    <th className="text-nowrap text-center">Chat</th>
                    <th className="text-center">Text</th>
                    <th className="text-nowrap text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m._id}>
                      <td className="text-nowrap text-center text-muted small">
                        {viewMode === "trash"
                          ? m.trashedAt
                            ? new Date(m.trashedAt).toLocaleString()
                            : "—"
                          : formatDate(m.timestamp)}
                      </td>
                      <td className="text-center">{m.fromJid}</td>
                      <td className="text-center">
                        {m.isGroup ? (
                          <span>{m.chatName || m.chatJid}</span>
                        ) : (
                          <span>
                            <span className="badge badge-soft-slate me-1">Personal</span>
                            <span className="text-muted small">{m.chatJid}</span>
                          </span>
                        )}
                      </td>
                      <td className="text-center" style={{ wordBreak: "break-word" }}>
                        {m.type !== "text" && <MediaTypeBadge type={m.type} />}
                        {m.text ? truncateWords(m.text, 8) : null}
                      </td>
                      <td className="text-center text-nowrap">
                        <button
                          className="btn btn-outline-secondary btn-sm me-1"
                          onClick={() => setViewingMessage(m)}
                          title="Lihat detail"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        {viewMode === "active" ? (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setConfirmingDeleteId(m._id)}
                            disabled={busyId === m._id}
                            title="Hapus"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-outline-success btn-sm me-1"
                              onClick={() => handleRestore(m._id)}
                              disabled={busyId === m._id}
                              title="Pulihkan"
                            >
                              <i className="bi bi-arrow-counterclockwise" />
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setConfirmingDeleteId(m._id)}
                              disabled={busyId === m._id}
                              title="Hapus permanen"
                            >
                              <i className="bi bi-trash3" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-center gap-3 mt-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset === 0 || loading}
              onClick={() => load(Math.max(offset - limit, 0))}
            >
              <i className="bi bi-chevron-left" /> Previous
            </button>
            <span className="text-muted small">
              {offset + 1}–{Math.min(offset + messages.length, total)} of {total}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset + messages.length >= total || loading}
              onClick={() => load(offset + limit)}
            >
              Next <i className="bi bi-chevron-right" />
            </button>
          </div>
        </>
      )}

      {viewingMessage && (
        <Modal title="Detail Pesan" onClose={() => setViewingMessage(null)}>
          <dl className="row mb-0">
            <dt className="col-4">Waktu</dt>
            <dd className="col-8">{formatDate(viewingMessage.timestamp)}</dd>
            <dt className="col-4">Dari</dt>
            <dd className="col-8">{viewingMessage.fromJid}</dd>
            <dt className="col-4">Chat</dt>
            <dd className="col-8">
              {viewingMessage.isGroup ? viewingMessage.chatName || viewingMessage.chatJid : "Personal (DM)"}
            </dd>
            <dt className="col-4">Tipe</dt>
            <dd className="col-8">{MEDIA_TYPE_INFO[viewingMessage.type]?.label ?? "Teks"}</dd>
            {viewMode === "trash" && (
              <>
                <dt className="col-4">Dihapus</dt>
                <dd className="col-8">
                  {viewingMessage.trashedAt ? new Date(viewingMessage.trashedAt).toLocaleString() : "—"}
                </dd>
              </>
            )}
          </dl>
          {viewingMessage.type !== "text" && viewingMessage.mediaFilename && (
            <div className="mt-3">
              <MediaPreview
                messageId={viewingMessage._id}
                mediaType={viewingMessage.type}
                mimetype={viewingMessage.mediaMimetype}
              />
            </div>
          )}
          {viewingMessage.text && (
            <div className="mt-3">
              <div className="text-muted small mb-1">
                {viewingMessage.type !== "text" ? "Keterangan" : "Isi pesan"}
              </div>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {viewingMessage.text}
              </p>
            </div>
          )}
        </Modal>
      )}

      {confirmingDeleteId &&
        (viewMode === "active" ? (
          <Modal
            title="Hapus pesan?"
            onClose={() => setConfirmingDeleteId(null)}
            footer={
              <>
                <button className="btn btn-outline-secondary" onClick={() => setConfirmingDeleteId(null)}>
                  Batal
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleTrash(confirmingDeleteId)}
                  disabled={busyId === confirmingDeleteId}
                >
                  {busyId === confirmingDeleteId ? "Menghapus…" : "Ya, hapus"}
                </button>
              </>
            }
          >
            <p className="mb-0">
              Pesan ini akan dipindahkan ke <strong>Riwayat</strong>. Kamu masih bisa menghapusnya permanen
              dari sana nanti.
            </p>
          </Modal>
        ) : (
          <Modal
            title="Hapus permanen?"
            onClose={() => setConfirmingDeleteId(null)}
            footer={
              <>
                <button className="btn btn-outline-secondary" onClick={() => setConfirmingDeleteId(null)}>
                  Batal
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeletePermanent(confirmingDeleteId)}
                  disabled={busyId === confirmingDeleteId}
                >
                  {busyId === confirmingDeleteId ? "Menghapus…" : "Ya, hapus permanen"}
                </button>
              </>
            }
          >
            <p className="mb-0 text-danger">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              Pesan ini (dan berkas media-nya, jika ada) akan dihapus permanen. Tindakan ini tidak bisa
              dibatalkan.
            </p>
          </Modal>
        ))}

      {confirmingReset &&
        (viewMode === "active" ? (
          <Modal
            title="Reset semua pesan?"
            onClose={() => setConfirmingReset(false)}
            footer={
              <>
                <button className="btn btn-outline-secondary" onClick={() => setConfirmingReset(false)}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={handleReset} disabled={resetting}>
                  {resetting ? "Memindahkan…" : "Ya, pindahkan ke Riwayat"}
                </button>
              </>
            }
          >
            <p className="mb-0">
              <i className="bi bi-info-circle me-2" />
              Ini akan memindahkan <strong>SEMUA</strong> pesan aktif ke Riwayat. Belum permanen — kamu masih
              bisa memulihkannya, atau menghapusnya permanen satu per satu (atau sekaligus) dari Riwayat.
            </p>
          </Modal>
        ) : (
          <Modal
            title="Reset semua pesan?"
            onClose={() => setConfirmingReset(false)}
            footer={
              <>
                <button className="btn btn-outline-secondary" onClick={() => setConfirmingReset(false)}>
                  Batal
                </button>
                <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>
                  {resetting ? "Menghapus…" : "Ya, hapus semua"}
                </button>
              </>
            }
          >
            <p className="mb-0 text-danger">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              Ini akan menghapus <strong>SEMUA</strong> pesan di Riwayat secara permanen, termasuk berkas
              media-nya. Tindakan ini tidak bisa dibatalkan.
            </p>
          </Modal>
        ))}
    </div>
  )
}

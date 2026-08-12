import { useEffect, useState } from "react"
import { api, type Message } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { MediaPreview } from "../components/MediaPreview.js"
import { MEDIA_TYPE_INFO, MediaTypeBadge, truncateWords } from "../messageUtils.js"
import { NAV_COLORS } from "../navColors.js"

export function Riwayat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const limit = 20

  const [viewingMessage, setViewingMessage] = useState<Message | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.messages(limit, newOffset, undefined, undefined, true)
      setMessages(res.messages)
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
  }, [])

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString()

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
      const res = await api.resetMessages()
      setMessages([])
      setTotal(0)
      setInfo(`Semua pesan dihapus permanen (${res.deletedCount}).`)
      setConfirmingReset(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Riwayat"
        color={NAV_COLORS.riwayat}
        title="Riwayat Pesan"
        subtitle="Pesan yang dihapus dari Messages singgah di sini dulu. Pulihkan, hapus permanen satu per satu, atau bersihkan semuanya sekaligus lewat Reset."
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="d-flex justify-content-end mb-2">
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => setConfirmingReset(true)}
          disabled={total === 0}
        >
          <i className="bi bi-exclamation-triangle me-1" />
          Reset Semua Pesan
        </button>
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && messages.length === 0 && <p className="text-muted fst-italic">Riwayat kosong.</p>}

      {messages.length > 0 && (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr
                    style={
                      { "--bs-table-bg": `color-mix(in srgb, ${NAV_COLORS.riwayat} 12%, white)` } as React.CSSProperties
                    }
                  >
                    <th className="text-nowrap text-center">Dihapus</th>
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
                        {m.trashedAt ? new Date(m.trashedAt).toLocaleString() : "—"}
                      </td>
                      <td className="text-center">{m.fromJid}</td>
                      <td className="text-center">
                        {m.isGroup ? (
                          <span>{m.chatName || m.chatJid}</span>
                        ) : (
                          <span>
                            <span className="badge text-bg-secondary me-1">Personal</span>
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
            <dt className="col-4">Dihapus</dt>
            <dd className="col-8">
              {viewingMessage.trashedAt ? new Date(viewingMessage.trashedAt).toLocaleString() : "—"}
            </dd>
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

      {confirmingDeleteId && (
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
      )}

      {confirmingReset && (
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
            Ini akan menghapus <strong>SEMUA</strong> pesan secara permanen — baik di Messages maupun di
            Riwayat, termasuk berkas media-nya. Tindakan ini tidak bisa dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  )
}

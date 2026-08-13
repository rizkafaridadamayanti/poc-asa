import { useEffect, useState } from "react"
import { api, type AnonymousIdea } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

export function AntrianIde() {
  const [ideas, setIdeas] = useState<AnonymousIdea[]>([])
  const [filter, setFilter] = useState<"new" | "reviewed" | "all">("new")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.anonymousIdeas(filter === "all" ? undefined : filter)
      setIdeas(res.ideas)
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

  const markReviewed = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.markIdeaReviewed(id)
      setIdeas((prev) => prev.filter((i) => i._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ide Anonim"
        color={NAV_COLORS.antrianIde}
        title="Antrian Ide Anonim"
        subtitle={
          <>
            Kanal privat buat anggota yang nggak nyaman usul di grup terbuka. Kirim DM ke bot dengan{" "}
            <code>/ide &lt;teks&gt;</code> — pengirimnya <strong>tidak pernah disimpan</strong>, jadi Pusat cuma
            lihat isi idenya, bukan siapa yang kirim.
          </>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <div className="segmented-tabs">
          <button
            type="button"
            className={`segmented-tab${filter === "new" ? " active" : ""}`}
            onClick={() => setFilter("new")}
          >
            <i className="bi bi-inbox" />
            Baru
          </button>
          <button
            type="button"
            className={`segmented-tab${filter === "reviewed" ? " active" : ""}`}
            onClick={() => setFilter("reviewed")}
          >
            <i className="bi bi-check2-circle" />
            Ditinjau
          </button>
          <button
            type="button"
            className={`segmented-tab${filter === "all" ? " active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <i className="bi bi-list-ul" />
            Semua
          </button>
        </div>
      </div>

      {loading && <p className="text-muted">Memuat…</p>}
      {!loading && ideas.length === 0 && (
        <EmptyState
          icon="bi-lightbulb"
          text={filter === "new" ? "Belum ada ide baru." : "Tidak ada data untuk filter ini."}
        />
      )}

      {ideas.map((idea) => (
        <div key={idea._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <span className={`badge rounded-pill ${idea.status === "new" ? "text-bg-success" : "text-bg-secondary"}`}>
                {idea.status === "new" ? "Baru" : "Ditinjau"}
              </span>
              <span className="text-muted small text-nowrap">{new Date(idea.createdAt).toLocaleString()}</span>
            </div>
            <p className="my-3" style={{ whiteSpace: "pre-wrap" }}>
              {idea.text}
            </p>
            {idea.status === "new" && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => markReviewed(idea._id)}
                disabled={busyId === idea._id}
              >
                <i className="bi bi-check2 me-1" />
                Tandai ditinjau
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

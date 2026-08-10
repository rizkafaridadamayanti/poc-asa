import { useEffect, useState } from "react"
import { api, type AnonymousIdea } from "../api.js"

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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h2 className="mb-1">Antrian Ide Anonim</h2>
      <p className="text-muted mb-4">
        Ide yang dikirim anggota lewat DM bot (<code>/ide &lt;teks&gt;</code>) — pengirimnya tidak
        disimpan, benar-benar anonim.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="btn-group mb-3">
        {(["new", "reviewed", "all"] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${f === filter ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter(f)}
          >
            {f === "new" ? "New" : f === "reviewed" ? "Reviewed" : "All"}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && ideas.length === 0 && <p className="text-muted fst-italic">No ideas here.</p>}

      {ideas.map((idea) => (
        <div key={idea._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <span className={`badge ${idea.status === "new" ? "text-bg-warning" : "text-bg-success"}`}>
                {idea.status}
              </span>
              <span className="text-muted small text-nowrap">
                {new Date(idea.createdAt).toLocaleString()}
              </span>
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
                Mark reviewed
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

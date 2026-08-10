import { useEffect, useState } from "react"
import { api, type Group, type Summary } from "../api.js"

export function Summaries() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  const [groups, setGroups] = useState<Group[]>([])
  const [groupFilter, setGroupFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [keywordFilter, setKeywordFilter] = useState("")

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.summaries(limit, newOffset, {
        groupJid: groupFilter || undefined,
        from: fromFilter || undefined,
        to: toFilter || undefined,
        keyword: keywordFilter || undefined,
      })
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
    api
      .groups()
      .then((res) => setGroups(res.groups))
      .catch(() => {})
  }, [])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    load(0)
  }

  const toggle = async (s: Summary, field: "read" | "important" | "trash") => {
    try {
      await api.updateSummary(s._id, { [field]: !s[field] })
      await load(offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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

  return (
    <div>
      <h2 className="mb-1">Summaries</h2>
      <p className="text-muted mb-4">
        Catatan dominasi bicara (meeting-bias) di bawah ini adalah <strong>signal</strong>, bukan
        vonis — pakai sebagai bahan diskusi, bukan penilaian final.
      </p>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={applyFilters} className="card mb-4">
        <div className="card-body row g-3 align-items-end">
          <div className="col-sm-3">
            <label htmlFor="groupFilter" className="form-label">
              Group
            </label>
            <select
              id="groupFilter"
              className="form-select"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g._id} value={g.waJid}>
                  {g.name || g.waJid}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-2">
            <label htmlFor="fromFilter" className="form-label">
              From
            </label>
            <input
              id="fromFilter"
              type="date"
              className="form-control"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-2">
            <label htmlFor="toFilter" className="form-label">
              To
            </label>
            <input
              id="toFilter"
              type="date"
              className="form-control"
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-3">
            <label htmlFor="keywordFilter" className="form-label">
              Keyword
            </label>
            <input
              id="keywordFilter"
              className="form-control"
              placeholder="search body…"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-2">
            <button className="btn btn-primary w-100" disabled={loading}>
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {loading && <p className="text-muted">Loading summaries…</p>}
      {!loading && summaries.length === 0 && <p className="text-muted fst-italic">No summaries yet.</p>}
      {summaries.map((s) => (
        <div key={s._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <strong>
                {new Date(s.periodStart).toLocaleDateString()} —{" "}
                {new Date(s.periodEnd).toLocaleDateString()}
              </strong>
              <span className="text-muted small">{s.sourceMessageIds.length} messages</span>
            </div>
            <div className="markdown-body mb-3">
              <pre className="bg-body-tertiary p-3 rounded">{s.bodyMd}</pre>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => toggle(s, "read")}>
                <i className={`bi ${s.read ? "bi-envelope" : "bi-envelope-open"} me-1`} />
                {s.read ? "Mark unread" : "Mark read"}
              </button>
              <button
                className={`btn btn-sm ${s.important ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => toggle(s, "important")}
              >
                <i className="bi bi-star me-1" />
                {s.important ? "Unmark important" : "Mark important"}
              </button>
              <button
                className={`btn btn-sm ${s.trash ? "btn-outline-success" : "btn-outline-danger"}`}
                onClick={() => toggle(s, "trash")}
              >
                <i className={`bi ${s.trash ? "bi-arrow-counterclockwise" : "bi-trash"} me-1`} />
                {s.trash ? "Restore" : "Trash"}
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => exportDocx(s)}>
                <i className="bi bi-file-earmark-word me-1" />
                Export .docx
              </button>
            </div>
          </div>
        </div>
      ))}
      {summaries.length > 0 && (
        <div className="d-flex align-items-center gap-3 mt-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={offset === 0 || loading}
            onClick={() => load(Math.max(offset - limit, 0))}
          >
            <i className="bi bi-chevron-left" /> Previous
          </button>
          <span className="text-muted small">
            {offset + 1}–{Math.min(offset + summaries.length, total)} of {total}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={offset + summaries.length >= total || loading}
            onClick={() => load(offset + limit)}
          >
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}

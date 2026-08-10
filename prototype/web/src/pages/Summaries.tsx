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
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
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
      <h2 className="page-title">Summaries</h2>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={applyFilters} className="card" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="form-group">
          <label htmlFor="groupFilter">Group</label>
          <select id="groupFilter" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g._id} value={g.waJid}>
                {g.name || g.waJid}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="fromFilter">From</label>
          <input id="fromFilter" type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="toFilter">To</label>
          <input id="toFilter" type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="keywordFilter">Keyword</label>
          <input
            id="keywordFilter"
            placeholder="search body…"
            value={keywordFilter}
            onChange={(e) => setKeywordFilter(e.target.value)}
          />
        </div>
        <button className="btn" disabled={loading}>
          Apply filters
        </button>
      </form>

      {loading && <p className="loading">Loading summaries…</p>}
      {!loading && summaries.length === 0 && <p className="empty">No summaries yet.</p>}
      {summaries.map((s) => (
        <div key={s._id} className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <strong>{new Date(s.periodStart).toLocaleDateString()} — {new Date(s.periodEnd).toLocaleDateString()}</strong>
            <span className="muted">{s.sourceMessageIds.length} messages</span>
          </div>
          <div className="markdown-body">
            <pre>{s.bodyMd}</pre>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button className="btn btn-secondary" onClick={() => toggle(s, "read")}>
              {s.read ? "Mark unread" : "Mark read"}
            </button>
            <button className="btn btn-secondary" onClick={() => toggle(s, "important")}>
              {s.important ? "Unmark important" : "Mark important"}
            </button>
            <button className="btn btn-secondary" onClick={() => toggle(s, "trash")}>
              {s.trash ? "Restore" : "Trash"}
            </button>
            <button className="btn btn-secondary" onClick={() => exportDocx(s)}>
              Export .docx
            </button>
          </div>
        </div>
      ))}
      {summaries.length > 0 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={offset === 0 || loading}
            onClick={() => load(Math.max(offset - limit, 0))}
          >
            Previous
          </button>
          <span>
            {offset + 1}–{Math.min(offset + summaries.length, total)} of {total}
          </span>
          <button
            className="btn btn-secondary"
            disabled={offset + summaries.length >= total || loading}
            onClick={() => load(offset + limit)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

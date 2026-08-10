import { useEffect, useState } from "react"
import {
  api,
  type CuratedInfo,
  type CuratedInfoStatus,
  type CuratedInfoType,
} from "../api.js"

const TYPE_LABEL: Record<CuratedInfoType, string> = {
  beasiswa: "Beasiswa",
  loker: "Magang / Loker",
  inovasi: "Inovasi",
}

const STATUS_FILTERS: Array<{ value: CuratedInfoStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
]

type FormState = {
  type: CuratedInfoType
  title: string
  body: string
  targetsText: string
}

const EMPTY_FORM: FormState = { type: "beasiswa", title: "", body: "", targetsText: "" }

function parseTargets(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function InformasiBaru() {
  const [items, setItems] = useState<CuratedInfo[]>([])
  const [filter, setFilter] = useState<CuratedInfoStatus | "all">("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.curatedInfos(filter === "all" ? undefined : filter)
      setItems(res.curatedInfos)
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

  const startCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const startEdit = (item: CuratedInfo) => {
    setEditingId(item._id)
    setForm({
      type: item.type,
      title: item.title,
      body: item.body,
      targetsText: item.targets.join("\n"),
    })
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    const payload = {
      type: form.type,
      title: form.title.trim(),
      body: form.body.trim(),
      targets: parseTargets(form.targetsText),
    }
    try {
      if (editingId) {
        await api.updateCuratedInfo(editingId, payload)
        setInfo("Draft updated.")
      } else {
        await api.createCuratedInfo(payload)
        setInfo("Draft created.")
      }
      cancelForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.deleteCuratedInfo(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.approveCuratedInfo(id)
      setInfo("Approved. Ready to fan out.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleFanOut = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      const res = await api.fanOutCuratedInfo(id)
      setInfo(
        res.failed.length === 0
          ? `Sent to all ${res.targets} group(s).`
          : `Sent to ${res.sent}/${res.targets} group(s). Failed: ${res.failed
              .map((f) => `${f.jid} (${f.error})`)
              .join(", ")}`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h2 className="page-title">Informasi Baru</h2>
      <p style={{ color: "var(--muted)", marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
        Curate beasiswa / magang / inovasi info. Draft it, get Pusat approval, then fan out to
        target groups.
      </p>

      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert success">{info}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={f.value === filter ? "btn" : "btn btn-secondary"}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!showForm && (
          <button className="btn" onClick={startCreate}>
            + New draft
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="card" style={{ marginBottom: "1.5rem", maxWidth: "560px" }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit draft" : "New draft"}</h3>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CuratedInfoType })}
              style={{ width: "100%", maxWidth: "480px", padding: "0.55rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem", font: "inherit" }}
            >
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Beasiswa Unggulan 2026"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Detail info, syarat, link pendaftaran…"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="targets">Target groups (one JID per line)</label>
            <textarea
              id="targets"
              value={form.targetsText}
              onChange={(e) => setForm({ ...form, targetsText: e.target.value })}
              placeholder="120363xxxxxxxxxxxx@g.us"
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create draft"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={cancelForm} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p className="loading">Loading…</p>}
      {!loading && items.length === 0 && <p className="empty">No curated info yet.</p>}

      {items.map((item) => (
        <div key={item._id} className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span className={`status-badge ${item.status}`}>{item.status}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {TYPE_LABEL[item.type]}
                </span>
              </div>
              <strong style={{ fontSize: "1.05rem" }}>{item.title}</strong>
            </div>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", margin: "0.75rem 0" }}>{item.body}</p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            Targets ({item.targets.length}): {item.targets.length > 0 ? item.targets.join(", ") : "—"}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {item.status === "draft" && (
              <>
                <button className="btn btn-secondary" onClick={() => startEdit(item)} disabled={busyId === item._id}>
                  Edit
                </button>
                <button
                  className="btn"
                  onClick={() => handleApprove(item._id)}
                  disabled={busyId === item._id}
                >
                  {busyId === item._id ? "Approving…" : "Approve"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(item._id)}
                  disabled={busyId === item._id}
                  style={{ color: "var(--danger)" }}
                >
                  Delete
                </button>
              </>
            )}
            {item.status === "approved" && (
              <button className="btn" onClick={() => handleFanOut(item._id)} disabled={busyId === item._id}>
                {busyId === item._id ? "Sending…" : "Fan out now"}
              </button>
            )}
            {item.status === "sent" && (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Sent {item.sentAt ? new Date(item.sentAt).toLocaleString() : ""}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

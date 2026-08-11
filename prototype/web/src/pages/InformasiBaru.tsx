import { useEffect, useState } from "react"
import {
  api,
  type CuratedInfo,
  type CuratedInfoStatus,
  type CuratedInfoType,
} from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

const TYPE_LABEL: Record<CuratedInfoType, string> = {
  beasiswa: "Beasiswa",
  loker: "Magang / Loker",
  inovasi: "Inovasi",
}

const STATUS_BADGE: Record<CuratedInfoStatus, string> = {
  draft: "text-bg-warning",
  approved: "text-bg-primary",
  sent: "text-bg-success",
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
      <PageHeader
        icon="bi-megaphone"
        color={NAV_COLORS.informasiBaru}
        title="Informasi Baru"
        subtitle="Curate beasiswa / magang / inovasi info. Draft it, get Pusat approval, then fan out to target groups."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="btn-group">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm ${f.value === filter ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={startCreate}>
            <i className="bi bi-plus-lg me-1" />
            New draft
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="card mb-4" style={{ maxWidth: "560px" }}>
          <div className="card-body">
            <h5 className="card-title">{editingId ? "Edit draft" : "New draft"}</h5>
            <div className="mb-3">
              <label htmlFor="type" className="form-label">
                Type
              </label>
              <select
                id="type"
                className="form-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CuratedInfoType })}
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="title" className="form-label">
                Title
              </label>
              <input
                id="title"
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Beasiswa Unggulan 2026"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="body" className="form-label">
                Body
              </label>
              <textarea
                id="body"
                className="form-control"
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Detail info, syarat, link pendaftaran…"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="targets" className="form-label">
                Target groups (one JID per line)
              </label>
              <textarea
                id="targets"
                className="form-control"
                rows={3}
                value={form.targetsText}
                onChange={(e) => setForm({ ...form, targetsText: e.target.value })}
                placeholder="120363xxxxxxxxxxxx@g.us"
              />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create draft"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={cancelForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-muted fst-italic">No curated info yet.</p>}

      {items.map((item) => (
        <div key={item._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                  <span className="text-muted small">{TYPE_LABEL[item.type]}</span>
                </div>
                <strong className="fs-6">{item.title}</strong>
              </div>
              <span className="text-muted small text-nowrap">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="my-3" style={{ whiteSpace: "pre-wrap" }}>
              {item.body}
            </p>
            <p className="text-muted small mb-3">
              Targets ({item.targets.length}): {item.targets.length > 0 ? item.targets.join(", ") : "—"}
            </p>
            <div className="d-flex gap-2 flex-wrap">
              {item.status === "draft" && (
                <>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => startEdit(item)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-pencil me-1" />
                    Edit
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(item._id)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-check-lg me-1" />
                    {busyId === item._id ? "Approving…" : "Approve"}
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(item._id)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-trash me-1" />
                    Delete
                  </button>
                </>
              )}
              {item.status === "approved" && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleFanOut(item._id)}
                  disabled={busyId === item._id}
                >
                  <i className="bi bi-broadcast me-1" />
                  {busyId === item._id ? "Sending…" : "Fan out now"}
                </button>
              )}
              {item.status === "sent" && (
                <span className="text-muted small">
                  Sent {item.sentAt ? new Date(item.sentAt).toLocaleString() : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from "react"
import { api, type Agenda } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

type FormState = {
  title: string
  description: string
  dueAt: string
  remindAtText: string
  audienceText: string
}

const EMPTY_FORM: FormState = { title: "", description: "", dueAt: "", remindAtText: "", audienceText: "" }

function parseLines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PengingatAgenda() {
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [upcomingOnly, setUpcomingOnly] = useState(true)
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
      const res = await api.agendas(upcomingOnly)
      setAgendas(res.agendas)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingOnly])

  const startCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const startEdit = (a: Agenda) => {
    setEditingId(a._id)
    setForm({
      title: a.title,
      description: a.description,
      dueAt: toLocalInputValue(a.dueAt),
      remindAtText: a.remindAt.map((r) => toLocalInputValue(r.at)).join("\n"),
      audienceText: a.audience.join("\n"),
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
      title: form.title.trim(),
      description: form.description.trim(),
      dueAt: new Date(form.dueAt).toISOString(),
      remindAt: parseLines(form.remindAtText).map((s) => new Date(s).toISOString()),
      audience: parseLines(form.audienceText),
    }
    try {
      if (editingId) {
        await api.updateAgenda(editingId, payload)
        setInfo("Agenda updated.")
      } else {
        await api.createAgenda(payload)
        setInfo("Agenda created.")
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
    try {
      await api.deleteAgenda(id)
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
        eyebrow="Penjadwalan"
        color={NAV_COLORS.pengingatAgenda}
        title="Pengingat Agenda"
        subtitle="Jadwalkan agenda dan waktu pengingatnya — dikirim otomatis ke WhatsApp audience saat jatuh tempo."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="form-check">
          <input
            id="upcomingOnly"
            type="checkbox"
            className="form-check-input"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
          />
          <label htmlFor="upcomingOnly" className="form-check-label">
            Upcoming only
          </label>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={startCreate}>
            <i className="bi bi-plus-lg me-1" />
            New agenda
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="card mb-4 mx-auto" style={{ maxWidth: "560px" }}>
          <div className="card-body">
            <h5 className="card-title">{editingId ? "Edit agenda" : "New agenda"}</h5>
            <div className="mb-3">
              <label htmlFor="title" className="form-label">
                Title
              </label>
              <input
                id="title"
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Rapat Rutin Bulanan"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Agenda, lokasi, catatan…"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="dueAt" className="form-label">
                Due at
              </label>
              <input
                id="dueAt"
                type="datetime-local"
                className="form-control"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="remindAt" className="form-label">
                Remind at (one datetime per line)
              </label>
              <textarea
                id="remindAt"
                className="form-control"
                rows={2}
                value={form.remindAtText}
                onChange={(e) => setForm({ ...form, remindAtText: e.target.value })}
                placeholder="2026-08-15T07:00"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="audience" className="form-label">
                Audience (one JID / phone per line)
              </label>
              <textarea
                id="audience"
                className="form-control"
                rows={2}
                value={form.audienceText}
                onChange={(e) => setForm({ ...form, audienceText: e.target.value })}
                placeholder="120363xxxxxxxxxxxx@g.us"
              />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create agenda"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={cancelForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && agendas.length === 0 && <p className="text-muted fst-italic">No agendas yet.</p>}

      {agendas.map((a) => (
        <div key={a._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <strong className="fs-6">{a.title}</strong>
              <span className="text-muted small text-nowrap">
                Due {new Date(a.dueAt).toLocaleString()}
              </span>
            </div>
            {a.description && <p className="my-2">{a.description}</p>}
            <p className="text-muted small my-1">
              Audience ({a.audience.length}): {a.audience.length > 0 ? a.audience.join(", ") : "—"}
            </p>
            <div className="d-flex gap-2 flex-wrap my-2">
              {a.remindAt.map((r, i) => (
                <span key={i} className={`badge ${r.sent ? "text-bg-success" : "text-bg-warning"}`}>
                  {new Date(r.at).toLocaleString()} {r.sent ? "✓ sent" : "pending"}
                </span>
              ))}
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => startEdit(a)} disabled={busyId === a._id}>
                <i className="bi bi-pencil me-1" />
                Edit
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleDelete(a._id)}
                disabled={busyId === a._id}
              >
                <i className="bi bi-trash me-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useMemo, useState } from "react"
import { api, type Agenda, type Group, type Participant } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { Drawer } from "../components/Drawer.js"
import { RecipientPicker } from "../components/RecipientPicker.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

type ReminderDraft = { at: string; label: string }

const REMINDER_PRESETS: { label: string; offsetDays: number }[] = [
  { label: "H-3", offsetDays: -3 },
  { label: "H-1", offsetDays: -1 },
  { label: "Saat jatuh tempo", offsetDays: 0 },
]

const EMPTY_FORM = { title: "", description: "", dueAt: "" }

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type DueStatus = "ok" | "soon" | "overdue"

const DUE_BADGE: Record<DueStatus, string> = {
  ok: "badge-soft-green",
  soon: "badge-soft-amber",
  overdue: "badge-soft-red",
}

function relativeDue(dueAt: string): { text: string; status: DueStatus } {
  const diffMs = new Date(dueAt).getTime() - Date.now()
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffMs < 0) return { text: "Sudah lewat", status: "overdue" }
  if (days === 0) return { text: "Hari ini", status: "soon" }
  if (days === 1) return { text: "Besok", status: "soon" }
  if (days <= 3) return { text: `${days} hari lagi`, status: "soon" }
  return { text: `${days} hari lagi`, status: "ok" }
}

// Separate from Aktif/Riwayat (which is soft-delete, not date-based — see
// the backend's /api/agendas trash flag). This filters by due date instead,
// entirely client-side since relativeDue() already computes it per item.
type DueFilter = "all" | "upcoming" | "overdue"

const DUE_FILTERS: Array<{ value: DueFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "upcoming", label: "Akan datang" },
  { value: "overdue", label: "Sudah lewat" },
]

// Describes a reminder's timing relative to the due date (e.g. "H-3",
// "H+1", "Saat jatuh tempo") instead of the generic "Custom" label a
// manually-picked datetime otherwise gets.
function reminderOffsetLabel(remindAtIso: string, dueAtIso: string): string {
  const days = Math.round(
    (new Date(dueAtIso).getTime() - new Date(remindAtIso).getTime()) / (24 * 60 * 60 * 1000),
  )
  if (days === 0) return "Saat jatuh tempo"
  return days > 0 ? `H-${days}` : `H+${Math.abs(days)}`
}

// Prefer a known group/participant name; otherwise format a raw phone-based
// JID as +62... instead of showing the bare "628xxx@s.whatsapp.net" string.
function formatAudienceEntry(jid: string, label: string): string {
  if (label !== jid) return label
  const numPart = jid.split("@")[0]
  return /^\d+$/.test(numPart) ? `+${numPart}` : label
}

// Compact "N penerima · FirstName" line for the card's metadata row, plus
// the names left out of that line so the "+M" next to it can show them on
// hover/tap (or in a modal, once there are too many to fit a tooltip).
function audienceSummary(
  jids: string[],
  audienceLabel: (jid: string) => string,
): { line: string; restNames: string[] } {
  if (jids.length === 0) return { line: "Belum ada penerima", restNames: [] }
  const resolved = jids.map((jid) => formatAudienceEntry(jid, audienceLabel(jid)))
  const [first, ...rest] = resolved
  return { line: `${jids.length} penerima · ${first}`, restNames: rest }
}

// Joined reminder offsets for the card's metadata row, e.g. "H-3, H-1".
function reminderSummary(remindAt: Agenda["remindAt"], dueAtIso: string): string {
  if (remindAt.length === 0) return "Tanpa pengingat"
  return remindAt
    .map((r) => (r.label && r.label !== "Custom" ? r.label : reminderOffsetLabel(r.at, dueAtIso)))
    .join(", ")
}

export function PengingatAgenda() {
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [viewMode, setViewMode] = useState<"active" | "trash">("active")
  const [dueFilter, setDueFilter] = useState<DueFilter>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [reminders, setReminders] = useState<ReminderDraft[]>([])
  const [customReminderAt, setCustomReminderAt] = useState("")
  const [audience, setAudience] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [audienceModalNames, setAudienceModalNames] = useState<string[] | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.agendas(false, viewMode === "trash")
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
  }, [viewMode])

  useEffect(() => {
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
    api.participants().then((res) => setParticipants(res.participants)).catch(() => {})
  }, [])

  const audienceLabel = useMemo(() => {
    const byJid = new Map<string, string>()
    for (const g of groups) byJid.set(g.waJid, g.name || g.waJid)
    for (const p of participants) byJid.set(p.waJid, p.displayName || p.waJid)
    return (jid: string) => byJid.get(jid) || jid
  }, [groups, participants])

  const switchView = (mode: "active" | "trash") => {
    setViewMode(mode)
    setShowForm(false)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setReminders([])
    setCustomReminderAt("")
    setAudience(new Set())
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const startEdit = (a: Agenda) => {
    setEditingId(a._id)
    setForm({ title: a.title, description: a.description, dueAt: toLocalInputValue(a.dueAt) })
    setReminders(a.remindAt.map((r) => ({ at: toLocalInputValue(r.at), label: r.label })))
    setCustomReminderAt("")
    setAudience(new Set(a.audience))
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
  }

  const addPresetReminder = (preset: { label: string; offsetDays: number }) => {
    if (!form.dueAt) {
      setError("Isi jatuh tempo dulu sebelum menambah pengingat.")
      return
    }
    const due = new Date(form.dueAt)
    due.setDate(due.getDate() + preset.offsetDays)
    setReminders((prev) => [...prev, { at: toLocalInputValue(due.toISOString()), label: preset.label }])
  }

  const addCustomReminder = () => {
    if (!customReminderAt) return
    const label = form.dueAt ? reminderOffsetLabel(customReminderAt, form.dueAt) : "Custom"
    setReminders((prev) => [...prev, { at: customReminderAt, label }])
    setCustomReminderAt("")
  }

  const removeReminder = (idx: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== idx))
  }

  const submitForm = async () => {
    if (!form.dueAt) {
      setError("Jatuh tempo wajib diisi.")
      return
    }
    if (audience.size === 0) {
      setError("Pilih minimal satu penerima.")
      return
    }
    setSaving(true)
    setError(null)
    setInfo(null)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      dueAt: new Date(form.dueAt).toISOString(),
      remindAt: reminders.map((r) => ({ at: new Date(r.at).toISOString(), label: r.label })),
      audience: [...audience],
    }
    try {
      if (editingId) {
        await api.updateAgenda(editingId, payload)
        setInfo("Agenda diperbarui.")
      } else {
        await api.createAgenda(payload)
        setInfo("Agenda dibuat.")
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
      setAgendas((prev) => prev.filter((a) => a._id !== id))
      setInfo("Agenda dipindahkan ke Riwayat.")
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
      await api.restoreAgenda(id)
      setAgendas((prev) => prev.filter((a) => a._id !== id))
      setInfo("Agenda dipulihkan.")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (!confirmingDeleteId) return
    setBusyId(confirmingDeleteId)
    setError(null)
    try {
      await api.deleteAgendaPermanent(confirmingDeleteId)
      setAgendas((prev) => prev.filter((a) => a._id !== confirmingDeleteId))
      setConfirmingDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const visibleAgendas =
    dueFilter === "all"
      ? agendas
      : agendas.filter((a) => {
          const isOverdue = relativeDue(a.dueAt).status === "overdue"
          return dueFilter === "overdue" ? isOverdue : !isOverdue
        })

  return (
    <div>
      <PageHeader
        eyebrow="Penjadwalan"
        color={NAV_COLORS.pengingatAgenda}
        title="Pengingat Agenda"
        subtitle="Jadwalkan rapat/kegiatan sekali dengan beberapa pengingat otomatis (mis. H-3, H-1) yang dikirim ke grup/nomor terpilih — beda dari Kelola Pesan yang cuma sekali kirim."
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="segmented-tabs">
            <button
              type="button"
              className={`segmented-tab${viewMode === "active" ? " active" : ""}`}
              onClick={() => switchView("active")}
            >
              <i className="bi bi-calendar-event" />
              Aktif
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
          <div className="vr d-none d-md-block" style={{ height: "24px" }} />
          <div className="segmented-tabs segmented-tabs-sm">
            {DUE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`segmented-tab${f.value === dueFilter ? " active" : ""}`}
                onClick={() => setDueFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {viewMode === "active" && !showForm && (
          <button className="btn btn-primary" onClick={startCreate}>
            <i className="bi bi-plus-lg me-1" />
            Agenda baru
          </button>
        )}
      </div>

      {showForm && (
        <Drawer
          title={editingId ? "Edit agenda" : "Agenda baru"}
          onClose={cancelForm}
          footer={
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={cancelForm} disabled={saving}>
                Batal
              </button>
              <button type="button" className="btn btn-primary" onClick={submitForm} disabled={saving}>
                {saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Buat agenda"}
              </button>
            </>
          }
        >
          <div className="mb-3">
            <label htmlFor="title" className="form-label">
              Judul
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
              Deskripsi
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
              Jatuh tempo
            </label>
            <input
              id="dueAt"
              type="datetime-local"
              className="form-control"
              style={{ maxWidth: "280px" }}
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label d-block">Pengingat</label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {REMINDER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => addPresetReminder(preset)}
                >
                  <i className="bi bi-plus-lg me-1" />
                  {preset.label}
                </button>
              ))}
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                style={{ width: "200px" }}
                value={customReminderAt}
                onChange={(e) => setCustomReminderAt(e.target.value)}
              />
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addCustomReminder}>
                <i className="bi bi-plus-lg me-1" />
                Custom
              </button>
            </div>
            {reminders.length === 0 ? (
              <p className="text-muted small fst-italic mb-0">
                Belum ada pengingat — agenda tetap tersimpan, tapi tidak akan otomatis mengirim apa pun.
              </p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {reminders.map((r, idx) => (
                  <span key={idx} className="stat-pill">
                    {r.label}: {new Date(r.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 ms-1 text-danger"
                      onClick={() => removeReminder(idx)}
                      title="Hapus pengingat ini"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label d-block">Penerima ({audience.size} dipilih)</label>
            <RecipientPicker selected={audience} onChange={setAudience} />
          </div>
        </Drawer>
      )}

      {loading && <p className="text-muted">Memuat…</p>}
      {!loading && agendas.length === 0 && (
        <EmptyState
          icon="bi-calendar-event"
          text={viewMode === "trash" ? "Riwayat kosong." : "Belum ada agenda."}
        />
      )}
      {!loading && agendas.length > 0 && visibleAgendas.length === 0 && (
        <EmptyState icon="bi-filter" text="Tidak ada agenda yang cocok dengan filter ini." />
      )}

      {visibleAgendas.map((a) => {
        const due = relativeDue(a.dueAt)
        const sentCount = a.remindAt.filter((r) => r.sent).length
        const recipients = audienceSummary(a.audience, audienceLabel)
        const reminderTooltip =
          a.remindAt.length > 0 ? `${sentCount} dari ${a.remindAt.length} reminder terkirim` : undefined
        return (
          <div key={a._id} className={`card mb-3 agenda-card-${due.status}`}>
            <div className="card-body agenda-card-body">
              {/* Row 1: title, due date, status badge, action icons */}
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <strong className="agenda-title">{a.title}</strong>
                <div className="d-flex align-items-center gap-3 flex-shrink-0">
                  <span className="agenda-due-date text-nowrap">
                    {new Date(a.dueAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className={`badge rounded-pill ${DUE_BADGE[due.status]}`}>{due.text}</span>
                  <div className="d-flex align-items-center gap-2">
                    {viewMode === "trash" ? (
                      <>
                        <button
                          type="button"
                          className="agenda-icon-btn agenda-icon-btn-success"
                          onClick={() => handleRestore(a._id)}
                          disabled={busyId === a._id}
                          title="Pulihkan"
                          aria-label="Pulihkan"
                        >
                          <i className="bi bi-arrow-counterclockwise" />
                        </button>
                        <button
                          type="button"
                          className="agenda-icon-btn agenda-icon-btn-danger"
                          onClick={() => setConfirmingDeleteId(a._id)}
                          disabled={busyId === a._id}
                          title="Hapus permanen"
                          aria-label="Hapus permanen"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="agenda-icon-btn"
                          onClick={() => startEdit(a)}
                          disabled={busyId === a._id}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="agenda-icon-btn agenda-icon-btn-danger"
                          onClick={() => handleDelete(a._id)}
                          disabled={busyId === a._id}
                          title="Hapus"
                          aria-label="Hapus"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: description */}
              {a.description && <p className="agenda-description-row line-clamp-2 mb-0">{a.description}</p>}

              {/* Row 3: recipients summary + reminder schedule summary */}
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <span className="agenda-meta">
                  <i className="bi bi-people me-1" />
                  {recipients.line}
                  {recipients.restNames.length > 0 &&
                    (recipients.restNames.length > 5 ? (
                      <button
                        type="button"
                        className="agenda-audience-more"
                        onClick={() => setAudienceModalNames(recipients.restNames)}
                      >
                        +{recipients.restNames.length}
                      </button>
                    ) : (
                      <span className="agenda-audience-wrap">
                        <button type="button" className="agenda-audience-more">
                          +{recipients.restNames.length}
                        </button>
                        <span className="agenda-audience-tooltip">{recipients.restNames.join(", ")}</span>
                      </span>
                    ))}
                </span>
                <span className="agenda-meta d-inline-flex align-items-center gap-1" title={reminderTooltip}>
                  {a.remindAt.length > 0 && (
                    <span
                      className={`agenda-reminder-dot${
                        sentCount === a.remindAt.length ? " agenda-reminder-dot-done" : sentCount > 0 ? " agenda-reminder-dot-partial" : ""
                      }`}
                    />
                  )}
                  {reminderSummary(a.remindAt, a.dueAt)}
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {confirmingDeleteId && (
        <Modal title="Hapus permanen?" onClose={() => setConfirmingDeleteId(null)}>
          <p>Agenda ini akan dihapus permanen dan tidak bisa dipulihkan lagi.</p>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-outline-secondary" onClick={() => setConfirmingDeleteId(null)}>
              Batal
            </button>
            <button className="btn btn-danger" onClick={handlePermanentDelete} disabled={busyId === confirmingDeleteId}>
              <i className="bi bi-trash3 me-1" />
              Ya, hapus permanen
            </button>
          </div>
        </Modal>
      )}

      {audienceModalNames && (
        <Modal title="Detail Penerima" onClose={() => setAudienceModalNames(null)}>
          <ul className="mb-0 small">
            {audienceModalNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import {
  api,
  type CuratedInfo,
  type CuratedInfoStatus,
  type CuratedInfoType,
  type FanOutResult,
} from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { Drawer } from "../components/Drawer.js"
import { RecipientPicker } from "../components/RecipientPicker.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

const TYPE_LABEL: Record<CuratedInfoType, string> = {
  beasiswa: "Beasiswa",
  loker: "Magang / Loker",
  inovasi: "Inovasi",
}

const TYPE_BADGE: Record<CuratedInfoType, string> = {
  beasiswa: "badge-soft-navy",
  loker: "badge-soft-secondary",
  inovasi: "badge-soft-accent",
}

const STATUS_BADGE: Record<CuratedInfoStatus, string> = {
  draft: "badge-soft-amber",
  scheduled: "badge-soft-amber",
  sent: "badge-soft-green",
}

const STATUS_FILTERS: Array<{ value: CuratedInfoStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "sent", label: "Sent" },
]

type FormState = { type: CuratedInfoType; title: string; body: string }
const EMPTY_FORM: FormState = { type: "beasiswa", title: "", body: "" }

type ActionMode = "send" | "schedule"

export function InformasiBaru() {
  const [items, setItems] = useState<CuratedInfo[]>([])
  const [filter, setFilter] = useState<CuratedInfoStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<"active" | "trash">("active")
  const [viewingItem, setViewingItem] = useState<CuratedInfo | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const [actionModal, setActionModal] = useState<ActionMode | null>(null)
  const [pickedTargets, setPickedTargets] = useState<Set<string>>(new Set())
  const [scheduleDate, setScheduleDate] = useState("")
  const [actionBusy, setActionBusy] = useState(false)
  const [actionResult, setActionResult] = useState<FanOutResult | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.curatedInfos(filter === "all" ? undefined : filter, viewMode === "trash")
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
  }, [filter, viewMode])

  const switchView = (mode: "active" | "trash") => {
    setViewMode(mode)
    setInfo(null)
    setError(null)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const startEdit = (item: CuratedInfo) => {
    setEditingId(item._id)
    setForm({ type: item.type, title: item.title, body: item.body })
    setShowForm(true)
    setInfo(null)
    setError(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const validateForm = () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Judul dan isi wajib diisi.")
      return false
    }
    return true
  }

  const saveDraft = async () => {
    if (!validateForm()) return
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await api.updateCuratedInfo(editingId, { type: form.type, title: form.title.trim(), body: form.body.trim() })
        setInfo("Draft diperbarui.")
      } else {
        await api.createCuratedInfo({ type: form.type, title: form.title.trim(), body: form.body.trim(), targets: [] })
        setInfo("Draft disimpan.")
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
      setInfo("Dipindahkan ke Riwayat.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleRestore = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.restoreCuratedInfo(id)
      setInfo("Dipulihkan.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleDeletePermanent = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.deleteCuratedInfoPermanent(id)
      setInfo("Dihapus permanen.")
      setConfirmingDeleteId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  // Opens the recipient-picker modal for the compose form (new or being-edited item).
  const openActionModal = (mode: ActionMode) => {
    if (!validateForm()) return
    setPickedTargets(new Set())
    setScheduleDate("")
    setActionResult(null)
    setActionModal(mode)
  }

  // Opens the same modal directly from a draft's list card, pre-filled with its existing content/targets.
  const quickAction = (item: CuratedInfo, mode: ActionMode) => {
    setEditingId(item._id)
    setForm({ type: item.type, title: item.title, body: item.body })
    setPickedTargets(new Set(item.targets))
    setScheduleDate("")
    setActionResult(null)
    setError(null)
    setActionModal(mode)
  }

  const closeActionModal = () => {
    if (actionBusy) return
    setActionModal(null)
  }

  const confirmAction = async () => {
    if (pickedTargets.size === 0) {
      setError("Pilih minimal satu penerima.")
      return
    }
    if (actionModal === "schedule" && !scheduleDate) {
      setError("Pilih tanggal & jam jadwal.")
      return
    }
    setActionBusy(true)
    setError(null)
    try {
      const payload = { type: form.type, title: form.title.trim(), body: form.body.trim(), targets: [...pickedTargets] }
      let id = editingId
      if (id) {
        await api.updateCuratedInfo(id, payload)
      } else {
        const created = await api.createCuratedInfo(payload)
        id = created._id
      }
      if (actionModal === "send") {
        const res = await api.sendCuratedInfo(id)
        setActionResult(res)
      } else {
        await api.scheduleCuratedInfo(id, new Date(scheduleDate).toISOString())
        setActionModal(null)
        setShowForm(false)
        setEditingId(null)
        setForm(EMPTY_FORM)
        setInfo("Info dijadwalkan.")
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionBusy(false)
    }
  }

  const finishSendResult = () => {
    setActionModal(null)
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSendNow = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      const res = await api.sendCuratedInfo(id)
      setInfo(
        res.failed.length === 0
          ? `Terkirim ke ${res.sent} penerima.`
          : `Terkirim ke ${res.sent}/${res.targets} penerima. Gagal: ${res.failed.map((f) => `${f.jid} (${f.error})`).join(", ")}`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleUnschedule = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.unscheduleCuratedInfo(id)
      setInfo("Jadwal dibatalkan, kembali ke draft.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredItems = q
    ? items.filter((item) => item.title.toLowerCase().includes(q) || TYPE_LABEL[item.type].toLowerCase().includes(q))
    : items

  return (
    <div>
      <PageHeader
        eyebrow="Broadcast Info"
        color={NAV_COLORS.informasiBaru}
        title="Kelola Pesan"
        subtitle="Tulis info beasiswa / magang / inovasi, lalu kirim langsung, jadwalkan, atau simpan sebagai draft dulu."
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
              <i className="bi bi-megaphone" />
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
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`segmented-tab${f.value === filter ? " active" : ""}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="input-group input-group-sm kelola-search-group" style={{ width: "220px" }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search groups-icon-accent" />
            </span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Cari judul atau kategori…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={startCreate}>
            <i className="bi bi-plus-lg me-1" />
            New info
          </button>
        )}
      </div>

      {showForm && (
        <Drawer
          title={editingId ? "Edit info" : "Info baru"}
          onClose={cancelForm}
          footer={
            <>
              <button type="button" className="btn btn-link text-muted" onClick={cancelForm} disabled={saving}>
                Batal
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={saveDraft} disabled={saving}>
                <i className="bi bi-save me-1" />
                {saving ? "Menyimpan…" : "Simpan Draft"}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openActionModal("send")} disabled={saving}>
                <i className="bi bi-send-fill me-1" />
                Kirim Langsung
              </button>
              <button type="button" className="btn btn-outline-primary" onClick={() => openActionModal("schedule")} disabled={saving}>
                <i className="bi bi-clock me-1" />
                Jadwalkan
              </button>
            </>
          }
        >
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
            />
          </div>
          <div className="mb-3">
            <label htmlFor="body" className="form-label">
              Body
            </label>
            <textarea
              id="body"
              className="form-control"
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Detail info, syarat, link pendaftaran…"
            />
          </div>
        </Drawer>
      )}

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && items.length === 0 && (
        <EmptyState icon="bi-megaphone" text="Belum ada info yang dibuat." />
      )}
      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <EmptyState icon="bi-search" text="Tidak ada info yang cocok dengan pencarian." />
      )}

      {filteredItems.map((item) => (
        <div key={item._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                  <span className={`badge ${TYPE_BADGE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                </div>
                <strong className="fs-6">{item.title}</strong>
                <p className="line-clamp-2 text-secondary small mb-0 mt-1">{item.body}</p>
              </div>
              <span className="text-muted small text-nowrap">
                Dibuat: {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            {item.status === "scheduled" && (
              <p className="text-warning-amber small mt-3 mb-0">
                <i className="bi bi-clock me-1" />
                Terjadwal: {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "—"}
              </p>
            )}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
              <div className="d-flex gap-2 flex-wrap align-items-center">
                {viewMode === "trash" ? (
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={() => handleRestore(item._id)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1" />
                    Pulihkan
                  </button>
                ) : (
                  <>
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
                          onClick={() => quickAction(item, "send")}
                          disabled={busyId === item._id}
                        >
                          <i className="bi bi-send-fill me-1" />
                          Kirim Langsung
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => quickAction(item, "schedule")}
                          disabled={busyId === item._id}
                        >
                          <i className="bi bi-clock me-1" />
                          Jadwalkan
                        </button>
                      </>
                    )}
                    {item.status === "scheduled" && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSendNow(item._id)}
                          disabled={busyId === item._id}
                        >
                          <i className="bi bi-send-fill me-1" />
                          {busyId === item._id ? "Mengirim…" : "Kirim Sekarang"}
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleUnschedule(item._id)}
                          disabled={busyId === item._id}
                        >
                          <i className="bi bi-x-circle me-1" />
                          Batalkan Jadwal
                        </button>
                      </>
                    )}
                    {item.status === "sent" && (
                      <span className="text-muted small">
                        Terkirim: {item.sentAt ? new Date(item.sentAt).toLocaleString() : "—"}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <button
                  className="btn btn-outline-accent btn-sm"
                  onClick={() => setViewingItem(item)}
                >
                  <i className="bi bi-eye me-1" />
                  Lihat Detail
                </button>
                {viewMode === "trash" ? (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setConfirmingDeleteId(item._id)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-trash3 me-1" />
                    Hapus Permanen
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(item._id)}
                    disabled={busyId === item._id}
                  >
                    <i className="bi bi-trash me-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {actionModal && (
        <Modal
          title={actionModal === "send" ? "Kirim Langsung" : "Jadwalkan Pengiriman"}
          onClose={closeActionModal}
          size="lg"
        >
          {actionResult ? (
            <div>
              <div className={`alert ${actionResult.failed.length === 0 ? "alert-success" : "alert-secondary"}`}>
                Terkirim ke {actionResult.sent} penerima
                {actionResult.failed.length > 0 && `, gagal ke ${actionResult.failed.length}`}.
              </div>
              {actionResult.failed.length > 0 && (
                <ul className="list-unstyled small text-danger mb-3">
                  {actionResult.failed.map((f) => (
                    <li key={f.jid}>
                      {f.jid}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn btn-primary" onClick={finishSendResult}>
                Selesai
              </button>
            </div>
          ) : (
            <>
              {actionModal === "schedule" && (
                <div className="mb-3">
                  <label htmlFor="scheduleDate" className="form-label">
                    Kirim pada
                  </label>
                  <input
                    id="scheduleDate"
                    type="datetime-local"
                    className="form-control"
                    style={{ maxWidth: "260px" }}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              )}
              <RecipientPicker selected={pickedTargets} onChange={setPickedTargets} />
              <div className="d-flex align-items-center justify-content-between mt-3">
                <span className="text-muted small">{pickedTargets.size} penerima dipilih</span>
                <button className="btn btn-primary" disabled={pickedTargets.size === 0 || actionBusy} onClick={confirmAction}>
                  {actionBusy
                    ? "Memproses…"
                    : actionModal === "send"
                      ? `Kirim ke ${pickedTargets.size} penerima`
                      : "Jadwalkan"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {viewingItem && (
        <Modal title="Detail Info" onClose={() => setViewingItem(null)}>
          <dl className="row mb-3">
            <dt className="col-4">Tipe</dt>
            <dd className="col-8">{TYPE_LABEL[viewingItem.type]}</dd>
            <dt className="col-4">Status</dt>
            <dd className="col-8">
              <span className={`badge ${STATUS_BADGE[viewingItem.status]}`}>{viewingItem.status}</span>
            </dd>
            <dt className="col-4">Dibuat</dt>
            <dd className="col-8">{new Date(viewingItem.createdAt).toLocaleString()}</dd>
            {viewingItem.scheduledAt && (
              <>
                <dt className="col-4">Terjadwal</dt>
                <dd className="col-8">{new Date(viewingItem.scheduledAt).toLocaleString()}</dd>
              </>
            )}
            {viewingItem.sentAt && (
              <>
                <dt className="col-4">Terkirim</dt>
                <dd className="col-8">{new Date(viewingItem.sentAt).toLocaleString()}</dd>
              </>
            )}
            {viewingItem.trashedAt && (
              <>
                <dt className="col-4">Dihapus</dt>
                <dd className="col-8">{new Date(viewingItem.trashedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
          <div className="mb-3">
            <div className="text-muted small mb-1">Judul</div>
            <strong>{viewingItem.title}</strong>
          </div>
          <div className="mb-3">
            <div className="text-muted small mb-1">Isi</div>
            <p className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {viewingItem.body}
            </p>
          </div>
          <div>
            <div className="text-muted small mb-1">Target ({viewingItem.targets.length})</div>
            {viewingItem.targets.length > 0 ? (
              <ul className="mb-0 small">
                {viewingItem.targets.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
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
            Info ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  )
}

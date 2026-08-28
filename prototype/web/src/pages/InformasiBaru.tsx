import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Send,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  RotateCcw,
  Edit2,
  Eye,
  X,
  Users,
  Briefcase,
  GraduationCap,
  Sparkles,
} from "lucide-react"
import { api, type CuratedInfo, type CuratedInfoStatus, type CuratedInfoType, type FanOutResult } from "../api.js"
import { Drawer } from "../components/Drawer.js"
import { RecipientPicker } from "../components/RecipientPicker.js"
import { ConfirmModal } from "../components/ConfirmModal.js"

const TYPE_LABEL: Record<CuratedInfoType, string> = { beasiswa: "Beasiswa", loker: "Magang / Loker", inovasi: "Inovasi" }
const TYPE_ICON: Record<CuratedInfoType, typeof GraduationCap> = { beasiswa: GraduationCap, loker: Briefcase, inovasi: Sparkles }
const TYPE_ICON_CLASS: Record<CuratedInfoType, string> = {
  beasiswa: "text-blue-600",
  loker: "text-emerald-600",
  inovasi: "text-amber-600",
}

const STATUS_FILTERS: Array<{ value: CuratedInfoStatus | "all"; label: string }> = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "sent", label: "Sent" },
]

type FormState = { type: CuratedInfoType; title: string; body: string }
const EMPTY_FORM: FormState = { type: "beasiswa", title: "", body: "" }
type ActionMode = "send" | "schedule"

function StatusBadge({ status }: { status: CuratedInfoStatus }) {
  if (status === "sent")
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
        <CheckCircle2 className="w-3 h-3" /> Sent
      </span>
    )
  if (status === "scheduled")
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3" /> Scheduled
      </span>
    )
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
      <FileText className="w-3 h-3" /> Draft
    </span>
  )
}

export function InformasiBaru() {
  const location = useLocation()
  const navigate = useNavigate()
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

  useEffect(() => {
    const prefillBody = (location.state as { prefillBody?: string } | null)?.prefillBody
    if (!prefillBody) return
    setEditingId(null)
    setForm({ type: "inovasi", title: "", body: prefillBody })
    setShowForm(true)
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

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

  const openActionModal = (mode: ActionMode) => {
    if (!validateForm()) return
    setPickedTargets(new Set())
    setScheduleDate("")
    setActionResult(null)
    setActionModal(mode)
  }
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
      if (id) await api.updateCuratedInfo(id, payload)
      else {
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
          : `Terkirim ke ${res.sent}/${res.targets} penerima. Gagal: ${res.failed.map((f) => f.jid).join(", ")}`,
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
  const filteredItems = q ? items.filter((item) => item.title.toLowerCase().includes(q) || TYPE_LABEL[item.type].toLowerCase().includes(q)) : items

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Kelola Pesan</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Sekali Kirim
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tulis info beasiswa, magang/loker, atau inovasi, lalu kirim langsung, jadwalkan, atau simpan sebagai draft.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Info
        </button>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {info && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{info}</div>}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center">
            <button
              onClick={() => switchView("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "active" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => switchView("trash")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "trash" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Riwayat
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  filter === f.value ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul broadcast…"
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-8">Memuat…</p>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500 space-y-2">
            <Send className="w-10 h-10 mx-auto opacity-30 text-blue-600" />
            <p className="font-bold text-slate-800">Belum ada info broadcast.</p>
            <p className="text-xs text-slate-500">Klik "New Info" untuk membuat pesan broadcast baru.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const TypeIcon = TYPE_ICON[item.type]
            return (
              <div
                key={item._id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md shadow-xs space-y-3.5 flex flex-col justify-between transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <TypeIcon className={`w-3.5 h-3.5 ${TYPE_ICON_CLASS[item.type]}`} />
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{TYPE_LABEL[item.type]}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">{item.body}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3 text-blue-600" />
                      {item.targets.length} Target
                    </span>
                    {item.status === "sent" && item.sentAt && (
                      <span className="text-emerald-700 font-bold">✓ {new Date(item.sentAt).toLocaleDateString("id-ID")}</span>
                    )}
                    {item.status === "scheduled" && item.scheduledAt && (
                      <span className="text-amber-700 font-mono font-bold">
                        {new Date(item.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setViewingItem(item)}
                        className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                      {viewMode === "active" && item.status === "draft" && (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => quickAction(item, "send")}
                            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            Kirim
                          </button>
                          <button
                            onClick={() => quickAction(item, "schedule")}
                            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
                          >
                            Jadwalkan
                          </button>
                        </>
                      )}
                      {viewMode === "active" && item.status === "scheduled" && (
                        <>
                          <button
                            onClick={() => handleSendNow(item._id)}
                            disabled={busyId === item._id}
                            className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            Kirim Sekarang
                          </button>
                          <button
                            onClick={() => handleUnschedule(item._id)}
                            disabled={busyId === item._id}
                            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer disabled:opacity-50"
                          >
                            Batal Jadwal
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {viewMode === "trash" ? (
                        <>
                          <button onClick={() => handleRestore(item._id)} disabled={busyId === item._id} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmingDeleteId(item._id)} disabled={busyId === item._id} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleDelete(item._id)} disabled={busyId === item._id} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showForm && (
        <Drawer
          title={editingId ? "Edit Info Broadcast" : "Buat Broadcast Info Baru"}
          onClose={cancelForm}
          footer={
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button onClick={cancelForm} disabled={saving} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-60">
                  Batal
                </button>
                <button onClick={saveDraft} disabled={saving} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-60">
                  {saving ? "Menyimpan…" : "Simpan Draft"}
                </button>
                <button onClick={() => openActionModal("schedule")} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60">
                  Jadwalkan…
                </button>
              </div>
              <button onClick={() => openActionModal("send")} disabled={saving} className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60">
                <Send className="w-4 h-4" />
                Kirim Langsung
              </button>
            </div>
          }
        >
          <div className="h-full flex flex-col space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Kategori</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CuratedInfoType })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 font-medium cursor-pointer"
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Judul</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Beasiswa Unggulan 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Isi Pesan</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Detail info, syarat, link pendaftaran…"
                className="w-full flex-1 min-h-[160px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium leading-relaxed resize-none"
              />
            </div>
          </div>
        </Drawer>
      )}

      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
          onClick={closeActionModal}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={closeActionModal} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            {actionResult ? (
              <div className="space-y-3">
                <div className={`px-3.5 py-2.5 rounded-xl text-sm ${actionResult.failed.length === 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  Terkirim ke {actionResult.sent} penerima{actionResult.failed.length > 0 && `, gagal ke ${actionResult.failed.length}`}.
                </div>
                <button onClick={finishSendResult} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">{actionModal === "send" ? "Kirim Pesan Sekarang" : "Atur Jadwal Kirim"}</h3>
                  <p className="text-xs text-slate-500">Pilih grup atau kontak penerima:</p>
                </div>
                {actionModal === "schedule" && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Waktu kirim</label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                    />
                  </div>
                )}
                <RecipientPicker selected={pickedTargets} onChange={setPickedTargets} />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">{pickedTargets.size} penerima dipilih</span>
                  <button
                    onClick={confirmAction}
                    disabled={pickedTargets.size === 0 || actionBusy}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md disabled:opacity-40 cursor-pointer"
                  >
                    {actionBusy ? "Memproses…" : actionModal === "send" ? `Kirim ke ${pickedTargets.size}` : "Jadwalkan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setViewingItem(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Detail Info</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-bold">{TYPE_LABEL[viewingItem.type]}</span>
                  <span className="text-slate-300">•</span>
                  <StatusBadge status={viewingItem.status} />
                </div>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Judul</span>
                <p className="text-sm font-bold text-slate-900">{viewingItem.title}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Isi</span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{viewingItem.body}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target ({viewingItem.targets.length})</span>
                {viewingItem.targets.length > 0 ? (
                  <ul className="text-xs text-slate-700 space-y-0.5">
                    {viewingItem.targets.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setViewingItem(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={() => confirmingDeleteId && handleDeletePermanent(confirmingDeleteId)}
        busy={busyId === confirmingDeleteId}
        title="Hapus permanen?"
        description="Info ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, hapus permanen"
        type="danger"
      />
    </div>
  )
}

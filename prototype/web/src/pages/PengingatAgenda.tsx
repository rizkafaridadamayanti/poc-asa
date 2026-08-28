import { useEffect, useMemo, useState } from "react"
import { CalendarCheck2, Plus, Users, Bell, Trash2, RotateCcw, Edit2, X } from "lucide-react"
import { api, type Agenda, type Group, type Participant } from "../api.js"
import { Drawer } from "../components/Drawer.js"
import { RecipientPicker } from "../components/RecipientPicker.js"
import { ConfirmModal } from "../components/ConfirmModal.js"

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
function relativeDue(dueAt: string): { text: string; status: DueStatus } {
  const diffMs = new Date(dueAt).getTime() - Date.now()
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffMs < 0) return { text: "Sudah lewat", status: "overdue" }
  if (days === 0) return { text: "Hari ini", status: "soon" }
  if (days === 1) return { text: "Besok", status: "soon" }
  if (days <= 3) return { text: `${days} hari lagi`, status: "soon" }
  return { text: `${days} hari lagi`, status: "ok" }
}

type DueFilter = "all" | "upcoming" | "overdue"
const DUE_FILTERS: Array<{ value: DueFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "upcoming", label: "Akan datang" },
  { value: "overdue", label: "Sudah lewat" },
]

function reminderOffsetLabel(remindAtIso: string, dueAtIso: string): string {
  const days = Math.round((new Date(dueAtIso).getTime() - new Date(remindAtIso).getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return "Saat jatuh tempo"
  return days > 0 ? `H-${days}` : `H+${Math.abs(days)}`
}

function formatAudienceEntry(jid: string, label: string): string {
  if (label !== jid) return label
  const numPart = jid.split("@")[0]
  return /^\d+$/.test(numPart) ? `+${numPart}` : label
}

function audienceSummary(jids: string[], audienceLabel: (jid: string) => string): { line: string; restNames: string[] } {
  if (jids.length === 0) return { line: "Belum ada penerima", restNames: [] }
  const resolved = jids.map((jid) => formatAudienceEntry(jid, audienceLabel(jid)))
  const [first, ...rest] = resolved
  return { line: `${jids.length} penerima • ${first}`, restNames: rest }
}

function reminderSummary(remindAt: Agenda["remindAt"], dueAtIso: string): string {
  if (remindAt.length === 0) return "Tanpa pengingat"
  return remindAt.map((r) => (r.label && r.label !== "Custom" ? r.label : reminderOffsetLabel(r.at, dueAtIso))).join(", ")
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
  const [audienceModal, setAudienceModal] = useState<{ title: string; names: string[] } | null>(null)

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
  const removeReminder = (idx: number) => setReminders((prev) => prev.filter((_, i) => i !== idx))

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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Pengingat Agenda</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Multi-Alarm
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Jadwalkan rapat/kegiatan sekali dengan beberapa pengingat otomatis (H-3, H-1, dst) — beda dari Kelola Pesan.
          </p>
        </div>
        {viewMode === "active" && (
          <button
            onClick={startCreate}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agenda Baru
          </button>
        )}
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {info && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{info}</div>}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center">
            <button
              onClick={() => switchView("active")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "active" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => switchView("trash")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "trash" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Riwayat
            </button>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            {DUE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDueFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dueFilter === f.value ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-8">Memuat…</p>
        ) : visibleAgendas.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500 space-y-2">
            <CalendarCheck2 className="w-10 h-10 mx-auto opacity-30 text-blue-600" />
            <p className="font-bold text-slate-800">{viewMode === "trash" ? "Riwayat kosong." : "Belum ada agenda."}</p>
            {viewMode === "active" && <p className="text-xs text-slate-500">Klik "Agenda Baru" untuk membuat jadwal kegiatan.</p>}
          </div>
        ) : (
          visibleAgendas.map((a) => {
            const due = relativeDue(a.dueAt)
            const sentCount = a.remindAt.filter((r) => r.sent).length
            const recipients = audienceSummary(a.audience, audienceLabel)
            return (
              <div key={a._id} className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md shadow-xs space-y-4 flex flex-col justify-between transition-all group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                        <CalendarCheck2 className="w-4 h-4" />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          due.status === "overdue"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : due.status === "soon"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {due.text}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {new Date(a.dueAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                    {a.description && <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed font-medium">{a.description}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1 mr-1">
                      <Bell className="w-3 h-3 text-blue-600" /> Pengingat:
                    </span>
                    {a.remindAt.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic">{reminderSummary(a.remindAt, a.dueAt)}</span>
                    ) : (
                      a.remindAt.map((r, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-50 text-slate-700 border border-slate-200">
                          {r.label && r.label !== "Custom" ? r.label : reminderOffsetLabel(r.at, a.dueAt)}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 font-medium">
                    <span className="flex items-center gap-1.5 truncate max-w-[240px]">
                      <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{recipients.line}</span>
                    </span>
                    {recipients.restNames.length > 0 && (
                      <button
                        onClick={() => setAudienceModal({ title: a.title, names: recipients.restNames })}
                        className="text-blue-600 hover:underline text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        +{recipients.restNames.length} lainnya
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      a.remindAt.length === 0
                        ? "text-slate-400"
                        : sentCount === a.remindAt.length
                          ? "text-emerald-700"
                          : sentCount > 0
                            ? "text-amber-700"
                            : "text-blue-700"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        a.remindAt.length === 0
                          ? "bg-slate-300"
                          : sentCount === a.remindAt.length
                            ? "bg-emerald-500"
                            : sentCount > 0
                              ? "bg-amber-500 animate-pulse"
                              : "bg-blue-500"
                      }`}
                    />
                    {a.remindAt.length === 0 ? "Tanpa pengingat" : `${sentCount}/${a.remindAt.length} pengingat terkirim`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {viewMode === "active" ? (
                      <>
                        <button onClick={() => startEdit(a)} disabled={busyId === a._id} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(a._id)} disabled={busyId === a._id} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleRestore(a._id)} disabled={busyId === a._id} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmingDeleteId(a._id)} disabled={busyId === a._id} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showForm && (
        <Drawer
          title={editingId ? "Edit Jadwal Agenda" : "Jadwalkan Agenda Baru"}
          onClose={cancelForm}
          footer={
            <>
              <button onClick={cancelForm} disabled={saving} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60">
                Batal
              </button>
              <button
                onClick={submitForm}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Buat Agenda"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Judul</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Rapat Rutin Bulanan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Deskripsi</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Agenda, lokasi, catatan…"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Jatuh tempo</label>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Pengingat</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {REMINDER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => addPresetReminder(preset)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 mb-2 min-h-[44px] items-center">
                {reminders.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Belum ada pengingat — agenda tetap tersimpan, tapi tidak mengirim apa pun.</span>
                ) : (
                  reminders.map((r, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                      {r.label}: {new Date(r.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      <button onClick={() => removeReminder(idx)} className="text-blue-500 hover:text-blue-800 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={customReminderAt}
                  onChange={(e) => setCustomReminderAt(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
                />
                <button onClick={addCustomReminder} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer">
                  + Tambah Custom
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Penerima ({audience.size} dipilih)</label>
              <RecipientPicker selected={audience} onChange={setAudience} />
            </div>
          </div>
        </Drawer>
      )}

      {audienceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in"
          onClick={() => setAudienceModal(null)}
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 relative max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAudienceModal(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Daftar Lengkap Penerima</h3>
                <p className="text-xs text-slate-500 truncate">{audienceModal.title}</p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {audienceModal.names.map((name, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={handlePermanentDelete}
        busy={busyId === confirmingDeleteId}
        title="Hapus permanen?"
        description="Agenda ini akan dihapus permanen dan tidak bisa dipulihkan lagi."
        confirmText="Ya, hapus permanen"
        type="danger"
      />
    </div>
  )
}

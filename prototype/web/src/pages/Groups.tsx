import { useEffect, useState } from "react"
import { Plus, RefreshCw, Search, Check, X, Edit2, Trash2, Info, Users, Crown, CalendarDays } from "lucide-react"
import { api, type Group, type GroupScope } from "../api.js"
import { ConfirmModal } from "../components/ConfirmModal.js"
import { Modal } from "../components/Modal.js"

const SCOPES: GroupScope[] = ["pusat", "dusun", "anggota"]
const SCOPE_LABEL: Record<GroupScope, string> = { pusat: "Pusat", dusun: "Dusun", anggota: "Anggota" }
const SCOPE_SELECT_CLASS: Record<GroupScope | "unset", string> = {
  pusat: "bg-blue-50 border-blue-200 text-blue-700",
  dusun: "bg-emerald-50 border-emerald-200 text-emerald-700",
  anggota: "bg-slate-100 border-slate-300 text-slate-700",
  unset: "bg-amber-50 border-amber-200 text-amber-700",
}

type ScopeFilter = GroupScope | "unreviewed" | "all"

function formatDate(iso: string | null): string {
  if (!iso) return "Tidak diketahui"
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
}

function shortJid(jid: string | null): string {
  if (!jid) return "Tidak diketahui"
  return jid.split("@")[0]
}

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [waJid, setWaJid] = useState("")
  const [name, setName] = useState("")
  const [scope, setScope] = useState<GroupScope>("anggota")
  const [dusunId, setDusunId] = useState("")
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
  const [search, setSearch] = useState("")

  const [editingDusunId, setEditingDusunId] = useState<string | null>(null)
  const [dusunDraft, setDusunDraft] = useState("")
  const [savingDusun, setSavingDusun] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.groups()
      setGroups(res.groups)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await api.createGroup({ waJid, name, scope, dusunId })
      setWaJid("")
      setName("")
      setScope("anggota")
      setDusunId("")
      setIsAddFormOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleScopeChange = async (id: string, next: GroupScope) => {
    try {
      await api.updateGroup(id, { scope: next })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const startEditDusun = (g: Group) => {
    setEditingDusunId(g._id)
    setDusunDraft(g.dusunId ?? "")
  }
  const cancelEditDusun = () => {
    setEditingDusunId(null)
    setDusunDraft("")
  }
  const saveDusun = async (id: string) => {
    setSavingDusun(true)
    setError(null)
    try {
      await api.updateGroup(id, { dusunId: dusunDraft.trim() })
      setEditingDusunId(null)
      setDusunDraft("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDusun(false)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.deleteGroup(id)
      setConfirmingDeleteId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setInfo(null)
    try {
      const res = await api.syncGroups()
      setInfo(
        res.created > 0
          ? `Sinkron selesai: ${res.scanned} grup dicek, ${res.created} baru ditambahkan (perlu ditinjau).`
          : `Sinkron selesai: ${res.scanned} grup dicek, semua sudah terdaftar.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredGroups = groups.filter((g) => {
    if (scopeFilter === "unreviewed" && g.scope !== null) return false
    if (scopeFilter !== "all" && scopeFilter !== "unreviewed" && g.scope !== scopeFilter) return false
    if (!q) return true
    return g.name.toLowerCase().includes(q) || g.waJid.toLowerCase().includes(q) || (g.dusunId ?? "").toLowerCase().includes(q)
  })

  const filterCount = (f: ScopeFilter) => {
    if (f === "all") return groups.length
    if (f === "unreviewed") return groups.filter((g) => g.scope === null).length
    return groups.filter((g) => g.scope === f).length
  }
  const deletingGroup = groups.find((g) => g._id === confirmingDeleteId)
  const viewingGroup = groups.find((g) => g._id === viewingId)

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Groups</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {groups.length} Terdaftar
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemetaan grup WhatsApp yang dipantau bot ke struktur organisasi (Pusat / Dusun / Anggota).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${syncing ? "animate-spin" : ""}`} />
            Sync dari WhatsApp
          </button>
          <button
            onClick={() => setIsAddFormOpen((v) => !v)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Grup / Kontak
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {info && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{info}</div>}

      {isAddFormOpen && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-blue-200 shadow-xl space-y-4 animate-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Tambah Grup / Kontak Baru</h3>
            </div>
            <button onClick={() => setIsAddFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                WA Group JID / Nomor <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={waJid}
                onChange={(e) => setWaJid(e.target.value)}
                placeholder="120363...@g.us atau 0812…"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Nama Tampilan</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: Taruna Dusun 4"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as GroupScope)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 font-medium cursor-pointer"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Dusun ID</label>
              <input
                value={scope === "pusat" ? "" : dusunId}
                onChange={(e) => setDusunId(e.target.value)}
                disabled={scope === "pusat"}
                placeholder={scope === "pusat" ? "Tidak berlaku untuk Pusat" : "misal: DSN-04"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 flex-wrap gap-2">
              <p className="text-[11px] text-slate-500 font-medium">
                💡 <em>Grup baru dari pesan masuk terdaftar otomatis — form ini untuk kontak/grup lama.</em>
              </p>
              <button
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                {saving ? "Menyimpan…" : "Simpan Grup"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:w-80">
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Filter Scope</label>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 font-medium cursor-pointer"
          >
            <option value="all">Semua Scope ({filterCount("all")})</option>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]} ({filterCount(s)})
              </option>
            ))}
            <option value="unreviewed">Belum diatur ({filterCount("unreviewed")})</option>
          </select>
        </div>
        <div className="w-full flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Cari nama, JID, atau dusun</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama grup atau kode dusun…"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Grup / Kontak</th>
                <th className="py-3 px-4 w-56">WhatsApp JID</th>
                <th className="py-3 px-4 w-40">Scope</th>
                <th className="py-3 px-4 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="py-10 text-center text-slate-400">Memuat…</td></tr>
              ) : filteredGroups.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-medium">Tidak ada grup yang sesuai filter.</td></tr>
              ) : (
                filteredGroups.map((g) => {
                  return (
                    <tr key={g._id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-xs">{g.name || g.waJid}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 select-all">{g.waJid}</td>
                      <td className="py-3 px-4">
                        <select
                          value={g.scope ?? ""}
                          onChange={(e) => handleScopeChange(g._id, e.target.value as GroupScope)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            SCOPE_SELECT_CLASS[g.scope ?? "unset"]
                          }`}
                        >
                          {g.scope === null && <option value="" disabled>— pilih —</option>}
                          {SCOPES.map((s) => (
                            <option key={s} value={s}>
                              {SCOPE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingId(g._id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Detail grup"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(g._id)}
                            disabled={busyId === g._id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingGroup && (
        <Modal title={viewingGroup.name || viewingGroup.waJid} onClose={() => setViewingId(null)}>
          <div className="space-y-4">
            <div className="font-mono text-[11px] text-slate-500 select-all break-all">{viewingGroup.waJid}</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Jumlah Anggota</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingGroup.participants.length}</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Dibuat Oleh</span>
                  <span className="font-mono font-bold text-slate-900 text-xs truncate block" title={viewingGroup.ownerJid ?? undefined}>
                    {shortJid(viewingGroup.ownerJid)}
                  </span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5">
                <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Grup Dibuat</span>
                  <span className="font-bold text-slate-900 text-xs">{formatDate(viewingGroup.groupCreatedAt)}</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Terdaftar di Bot</span>
                  <span className="font-bold text-slate-900 text-xs">{formatDate(viewingGroup.createdAt)}</span>
                </div>
              </div>
            </div>

            {(viewingGroup.scope === "dusun" || viewingGroup.scope === "anggota") && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Dusun ID</span>
                {editingDusunId === viewingGroup._id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={dusunDraft}
                      onChange={(e) => setDusunDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveDusun(viewingGroup._id)
                        if (e.key === "Escape") cancelEditDusun()
                      }}
                      disabled={savingDusun}
                      placeholder="misal: DSN-04"
                      className="px-2.5 py-1.5 bg-white border border-blue-500 rounded-lg text-xs text-slate-900 font-mono w-44"
                    />
                    <button onClick={() => saveDusun(viewingGroup._id)} disabled={savingDusun} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEditDusun} disabled={savingDusun} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-700 font-semibold">
                      {viewingGroup.dusunId || <span className="text-slate-400 italic">belum diatur</span>}
                    </span>
                    <button onClick={() => startEditDusun(viewingGroup)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {viewingGroup.description && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Deskripsi Grup</span>
                <p className="text-xs text-slate-700 leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-wrap">
                  {viewingGroup.description}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                Sumber: {viewingGroup.source === "auto" ? "Otomatis" : "Manual"}
              </span>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={() => confirmingDeleteId && handleDelete(confirmingDeleteId)}
        busy={busyId === confirmingDeleteId}
        title="Hapus registrasi grup?"
        description={`Grup "${deletingGroup?.name || deletingGroup?.waJid || ""}" akan dihapus dari basis data bot. Pesan masuk berikutnya akan otomatis terdaftar lagi sebagai "Belum diatur".`}
        confirmText="Hapus Registrasi"
        type="danger"
      />
    </div>
  )
}

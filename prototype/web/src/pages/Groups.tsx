import { useEffect, useState } from "react"
import { api, type Group, type GroupScope } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

const SCOPES: GroupScope[] = ["pusat", "dusun", "anggota"]

const SCOPE_LABEL: Record<GroupScope, string> = {
  pusat: "Pusat",
  dusun: "Dusun",
  anggota: "Anggota",
}

const SCOPE_BADGE: Record<GroupScope, string> = {
  pusat: "badge-soft-slate",
  dusun: "badge-soft-slate",
  anggota: "badge-soft-slate",
}

const SCOPE_DOT: Record<GroupScope, string> = {
  pusat: "#334155",
  dusun: "#64748b",
  anggota: "#cbd5e1",
}

type ScopeFilter = GroupScope | "unreviewed" | "all"

const FILTER_LABEL: Record<ScopeFilter, string> = {
  all: "Semua",
  pusat: "Pusat",
  dusun: "Dusun",
  anggota: "Anggota",
  unreviewed: "Belum diatur",
}

const FILTER_DOT: Partial<Record<ScopeFilter, string>> = {
  pusat: SCOPE_DOT.pusat,
  dusun: SCOPE_DOT.dusun,
  anggota: SCOPE_DOT.anggota,
  unreviewed: "#cbd5e1",
}

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [waJid, setWaJid] = useState("")
  const [name, setName] = useState("")
  const [scope, setScope] = useState<GroupScope>("anggota")
  const [dusunId, setDusunId] = useState("")
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

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
    if (!confirm("Hapus registrasi grup ini?")) return
    setBusyId(id)
    setError(null)
    setInfo(null)
    try {
      await api.deleteGroup(id)
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
    return (
      g.name.toLowerCase().includes(q) ||
      g.waJid.toLowerCase().includes(q) ||
      (g.dusunId ?? "").toLowerCase().includes(q)
    )
  })

  const unreviewedCount = groups.filter((g) => g.scope === null).length

  const filterCount = (f: ScopeFilter) => {
    if (f === "all") return groups.length
    if (f === "unreviewed") return unreviewedCount
    return groups.filter((g) => g.scope === f).length
  }

  return (
    <div>
      <PageHeader eyebrow="Manajemen Grup" color={NAV_COLORS.groups} title="Groups" />
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <form onSubmit={handleAdd} className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label htmlFor="waJid" className="form-label">
                WA Group JID
              </label>
              <input
                id="waJid"
                className="form-control"
                placeholder="120363...@g.us atau 0812..."
                value={waJid}
                onChange={(e) => setWaJid(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input id="name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label htmlFor="scope" className="form-label">
                Scope
              </label>
              <select
                id="scope"
                className="form-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as GroupScope)}
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label htmlFor="dusunId" className="form-label">
                Dusun ID
              </label>
              <input
                id="dusunId"
                className="form-control"
                value={dusunId}
                onChange={(e) => setDusunId(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" disabled={saving}>
                {saving ? "Saving…" : "Add group"}
              </button>
            </div>
          </div>
          <div className="form-text mt-2">
            Grup baru otomatis terdaftar begitu bot menerima pesan darinya (scope perlu ditinjau
            manual). Form ini buat mendaftarkan kontak pribadi, atau grup lama yang belum pernah
            kirim pesan — pakai <b>Sync from WhatsApp</b> di bawah untuk itu. JID lengkap
            (<code>xxx@g.us</code>) atau nomor HP biasa, otomatis dinormalisasi.
          </div>
        </div>
      </form>

      <div className="card mb-3">
        <div className="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm dropdown-toggle groups-filter-btn"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {FILTER_DOT[scopeFilter] && <span className="scope-dot" style={{ background: FILTER_DOT[scopeFilter] }} />}
              {FILTER_LABEL[scopeFilter]}
              <span className="tab-count">{filterCount(scopeFilter)}</span>
            </button>
            <ul className="dropdown-menu groups-filter-menu">
              <li>
                <button
                  type="button"
                  className={`dropdown-item${scopeFilter === "all" ? " active" : ""}`}
                  onClick={() => setScopeFilter("all")}
                >
                  Semua
                  <span className="tab-count">{filterCount("all")}</span>
                </button>
              </li>
              {SCOPES.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className={`dropdown-item${scopeFilter === s ? " active" : ""}`}
                    onClick={() => setScopeFilter(s)}
                  >
                    <span className="scope-dot" style={{ background: SCOPE_DOT[s] }} />
                    {SCOPE_LABEL[s]}
                    <span className="tab-count">{filterCount(s)}</span>
                  </button>
                </li>
              ))}
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  type="button"
                  className={`dropdown-item${scopeFilter === "unreviewed" ? " active" : ""}`}
                  onClick={() => setScopeFilter("unreviewed")}
                >
                  <span className="scope-dot" style={{ background: FILTER_DOT.unreviewed }} />
                  Belum diatur
                  <span className="tab-count">{filterCount("unreviewed")}</span>
                </button>
              </li>
            </ul>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <div className="input-group input-group-sm" style={{ width: "240px" }}>
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                className="form-control border-start-0 ps-0"
                placeholder="Cari nama, JID, atau dusun…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-outline-secondary btn-sm text-nowrap" onClick={handleSync} disabled={syncing}>
              <i className="bi bi-arrow-repeat me-1" />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="text-muted">Loading groups…</p>}
      {!loading && groups.length === 0 && <EmptyState icon="bi-people" text="Belum ada grup." />}
      {!loading && groups.length > 0 && filteredGroups.length === 0 && (
        <EmptyState icon="bi-search" text="Tidak ada grup yang cocok dengan filter ini." />
      )}
      {filteredGroups.map((g) => (
        <div key={g._id} className={`card mb-2 groups-row ${g.scope === null ? "border-secondary-subtle" : ""}`}>
          <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>{g.name || g.waJid}</strong>
              {g.source === "auto" && <span className="text-muted small ms-2">(auto)</span>}
              <div className="text-muted small d-flex align-items-center flex-wrap gap-1">
                <span>{g.waJid}</span>
                {editingDusunId === g._id ? (
                  <span className="d-inline-flex align-items-center gap-1">
                    <span>·</span>
                    <input
                      autoFocus
                      className="form-control form-control-sm dusun-edit-input"
                      placeholder="Nama dusun"
                      value={dusunDraft}
                      onChange={(e) => setDusunDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveDusun(g._id)
                        if (e.key === "Escape") cancelEditDusun()
                      }}
                      disabled={savingDusun}
                    />
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-success"
                      onClick={() => saveDusun(g._id)}
                      disabled={savingDusun}
                      title="Simpan"
                    >
                      <i className="bi bi-check-lg" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-muted"
                      onClick={cancelEditDusun}
                      disabled={savingDusun}
                      title="Batal"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-muted dusun-edit-trigger"
                    onClick={() => startEditDusun(g)}
                    title="Edit dusun"
                  >
                    {g.dusunId ? `· dusun: ${g.dusunId}` : "+ Tambah dusun"}
                    <i className="bi bi-pencil ms-1" />
                  </button>
                )}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {g.scope === null ? (
                <span className="badge rounded-pill badge-soft-slate">Belum diatur</span>
              ) : (
                <span className={`badge rounded-pill ${SCOPE_BADGE[g.scope]}`}>{SCOPE_LABEL[g.scope]}</span>
              )}
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={g.scope ?? ""}
                onChange={(e) => handleScopeChange(g._id, e.target.value as GroupScope)}
              >
                {g.scope === null && (
                  <option value="" disabled>
                    — pilih scope —
                  </option>
                )}
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleDelete(g._id)}
                disabled={busyId === g._id}
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

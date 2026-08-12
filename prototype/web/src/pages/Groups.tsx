import { useEffect, useState } from "react"
import { api, type Group, type GroupScope } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

const SCOPES: GroupScope[] = ["pusat", "dusun", "anggota"]

const SCOPE_BADGE: Record<GroupScope, string> = {
  pusat: "text-bg-danger",
  dusun: "text-bg-warning",
  anggota: "text-bg-secondary",
}

type ScopeFilter = GroupScope | "unreviewed" | "all"

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
                    {s}
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

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="btn-group">
          <button
            className={`btn btn-sm ${scopeFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setScopeFilter("all")}
          >
            All
          </button>
          {SCOPES.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${scopeFilter === s ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScopeFilter(s)}
            >
              {s}
            </button>
          ))}
          <button
            className={`btn btn-sm ${scopeFilter === "unreviewed" ? "btn-warning" : "btn-outline-warning"}`}
            onClick={() => setScopeFilter("unreviewed")}
          >
            Belum diatur{unreviewedCount > 0 ? ` (${unreviewedCount})` : ""}
          </button>
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: "260px" }}
            placeholder="Cari nama, JID, atau dusun…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-secondary btn-sm text-nowrap" onClick={handleSync} disabled={syncing}>
            <i className="bi bi-arrow-repeat me-1" />
            {syncing ? "Syncing…" : "Sync from WhatsApp"}
          </button>
        </div>
      </div>

      {loading && <p className="text-muted">Loading groups…</p>}
      {!loading && groups.length === 0 && <p className="text-muted fst-italic">No groups yet.</p>}
      {!loading && groups.length > 0 && filteredGroups.length === 0 && (
        <p className="text-muted fst-italic">No groups match this filter.</p>
      )}
      {filteredGroups.map((g) => (
        <div key={g._id} className={`card mb-2 ${g.scope === null ? "border-warning-subtle" : ""}`}>
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>{g.name || g.waJid}</strong>
              {g.source === "auto" && <span className="text-muted small ms-2">(auto)</span>}
              <div className="text-muted small">
                {g.waJid}
                {g.dusunId ? ` · dusun: ${g.dusunId}` : ""}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {g.scope === null ? (
                <span className="badge text-bg-warning">Belum diatur</span>
              ) : (
                <span className={`badge ${SCOPE_BADGE[g.scope]}`}>{g.scope}</span>
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
                    {s}
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

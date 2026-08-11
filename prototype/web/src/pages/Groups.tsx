import { useEffect, useState } from "react"
import { api, type Group, type GroupScope } from "../api.js"

const SCOPES: GroupScope[] = ["pusat", "dusun", "anggota"]

const SCOPE_BADGE: Record<GroupScope, string> = {
  pusat: "text-bg-danger",
  dusun: "text-bg-warning",
  anggota: "text-bg-secondary",
}

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [waJid, setWaJid] = useState("")
  const [name, setName] = useState("")
  const [scope, setScope] = useState<GroupScope>("anggota")
  const [dusunId, setDusunId] = useState("")
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [scopeFilter, setScopeFilter] = useState<GroupScope | "all">("all")
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
    try {
      await api.deleteGroup(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredGroups = groups.filter((g) => {
    if (scopeFilter !== "all" && g.scope !== scopeFilter) return false
    if (!q) return true
    return (
      g.name.toLowerCase().includes(q) ||
      g.waJid.toLowerCase().includes(q) ||
      g.dusunId.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <h2 className="mb-4">Groups</h2>
      {error && <div className="alert alert-danger">{error}</div>}

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
            Grup: isi JID lengkap (<code>xxx@g.us</code>). Kontak pribadi: nomor HP biasa, otomatis
            dinormalisasi ke format WhatsApp.
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
        </div>
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: "260px" }}
          placeholder="Cari nama, JID, atau dusun…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-muted">Loading groups…</p>}
      {!loading && groups.length === 0 && <p className="text-muted fst-italic">No groups yet.</p>}
      {!loading && groups.length > 0 && filteredGroups.length === 0 && (
        <p className="text-muted fst-italic">No groups match this filter.</p>
      )}
      {filteredGroups.map((g) => (
        <div key={g._id} className="card mb-2">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>{g.name || g.waJid}</strong>
              <div className="text-muted small">
                {g.waJid}
                {g.dusunId ? ` · dusun: ${g.dusunId}` : ""}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${SCOPE_BADGE[g.scope]}`}>{g.scope}</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={g.scope}
                onChange={(e) => handleScopeChange(g._id, e.target.value as GroupScope)}
              >
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

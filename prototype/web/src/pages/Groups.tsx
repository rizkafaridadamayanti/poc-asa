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

  return (
    <div>
      <h2 className="mb-4">Groups</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleAdd} className="card mb-4">
        <div className="card-body row g-3 align-items-end">
          <div className="col-sm-3">
            <label htmlFor="waJid" className="form-label">
              WA Group JID
            </label>
            <input
              id="waJid"
              className="form-control"
              placeholder="120363...@g.us"
              value={waJid}
              onChange={(e) => setWaJid(e.target.value)}
              required
            />
          </div>
          <div className="col-sm-3">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input id="name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-sm-2">
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
          <div className="col-sm-2">
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
          <div className="col-sm-2">
            <button className="btn btn-primary w-100" disabled={saving}>
              {saving ? "Saving…" : "Add group"}
            </button>
          </div>
        </div>
      </form>

      {loading && <p className="text-muted">Loading groups…</p>}
      {!loading && groups.length === 0 && <p className="text-muted fst-italic">No groups yet.</p>}
      {groups.map((g) => (
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
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

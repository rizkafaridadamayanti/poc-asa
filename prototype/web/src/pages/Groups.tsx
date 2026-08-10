import { useEffect, useState } from "react"
import { api, type Group, type GroupScope } from "../api.js"

const SCOPES: GroupScope[] = ["pusat", "dusun", "anggota"]

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
      <h2 className="page-title">Groups</h2>
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleAdd} className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="form-group">
          <label htmlFor="waJid">WA Group JID</label>
          <input
            id="waJid"
            placeholder="120363...@g.us"
            value={waJid}
            onChange={(e) => setWaJid(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="scope">Scope</label>
          <select id="scope" value={scope} onChange={(e) => setScope(e.target.value as GroupScope)}>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="dusunId">Dusun ID</label>
          <input id="dusunId" value={dusunId} onChange={(e) => setDusunId(e.target.value)} />
        </div>
        <button className="btn" disabled={saving}>
          {saving ? "Saving…" : "Add group"}
        </button>
      </form>

      {loading && <p className="loading">Loading groups…</p>}
      {!loading && groups.length === 0 && <p className="empty">No groups yet.</p>}
      {groups.map((g) => (
        <div
          key={g._id}
          className="card"
          style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <strong>{g.name || g.waJid}</strong>
            <div className="muted">{g.waJid}{g.dusunId ? ` · dusun: ${g.dusunId}` : ""}</div>
          </div>
          <select value={g.scope} onChange={(e) => handleScopeChange(g._id, e.target.value as GroupScope)}>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

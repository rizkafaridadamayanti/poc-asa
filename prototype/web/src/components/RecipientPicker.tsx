import { useEffect, useMemo, useState } from "react"
import { api, type Group, type Participant } from "../api.js"

type Tab = "number" | "group"

export function RecipientPicker({
  selected,
  onChange,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [tab, setTab] = useState<Tab>("number")
  const [search, setSearch] = useState("")
  const [groups, setGroups] = useState<Group[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
    api.participants().then((res) => setParticipants(res.participants)).catch(() => {})
  }, [])

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants
    return participants.filter(
      (p) => (p.displayName || p.waJid).toLowerCase().includes(q) || p.waJid.toLowerCase().includes(q),
    )
  }, [participants, search])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => (g.name || g.waJid).toLowerCase().includes(q) || g.waJid.toLowerCase().includes(q))
  }, [groups, search])

  const numberCount = useMemo(() => participants.filter((p) => selected.has(p.waJid)).length, [participants, selected])
  const groupCount = useMemo(() => groups.filter((g) => selected.has(g.waJid)).length, [groups, selected])

  const toggleOne = (jid: string) => {
    const next = new Set(selected)
    if (next.has(jid)) next.delete(jid)
    else next.add(jid)
    onChange(next)
  }

  const allNumbersSelected = filteredParticipants.length > 0 && filteredParticipants.every((p) => selected.has(p.waJid))
  const toggleAllNumbers = () => {
    const next = new Set(selected)
    if (allNumbersSelected) filteredParticipants.forEach((p) => next.delete(p.waJid))
    else filteredParticipants.forEach((p) => next.add(p.waJid))
    onChange(next)
  }

  const allGroupsSelected = filteredGroups.length > 0 && filteredGroups.every((g) => selected.has(g.waJid))
  const toggleAllGroups = () => {
    const next = new Set(selected)
    if (allGroupsSelected) filteredGroups.forEach((g) => next.delete(g.waJid))
    else filteredGroups.forEach((g) => next.add(g.waJid))
    onChange(next)
  }

  return (
    <div>
      <div className="btn-group mb-3">
        <button
          type="button"
          className={`btn btn-sm ${tab === "number" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("number")}
        >
          <i className="bi bi-telephone me-1" />
          Nomor {numberCount > 0 && `(${numberCount})`}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "group" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("group")}
        >
          <i className="bi bi-people me-1" />
          Grup {groupCount > 0 && `(${groupCount})`}
        </button>
      </div>

      <div className="d-flex gap-2 mb-3">
        <div className="input-group">
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-muted" />
          </span>
          <input
            className="form-control"
            placeholder={tab === "number" ? "Cari nama atau nomor…" : "Cari nama grup…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary text-nowrap"
          onClick={tab === "number" ? toggleAllNumbers : toggleAllGroups}
          title="Pilih/batalkan semua"
        >
          <i className="bi bi-check2-all me-1" />
          {(tab === "number" ? allNumbersSelected : allGroupsSelected) ? "Batalkan semua" : "Pilih semua"}
        </button>
      </div>

      <div style={{ maxHeight: "280px", overflowY: "auto" }}>
        {tab === "number" ? (
          <>
            {filteredParticipants.length === 0 && <p className="text-muted fst-italic">Tidak ada kontak yang cocok.</p>}
            {filteredParticipants.map((p) => (
              <label key={p._id} className="d-flex align-items-center gap-2 py-2 px-2 border-bottom" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selected.has(p.waJid)}
                  onChange={() => toggleOne(p.waJid)}
                />
                <span>
                  <span className="d-block">{p.displayName || p.waJid.split("@")[0]}</span>
                  {p.displayName && <span className="text-muted small">{p.waJid.split("@")[0]}</span>}
                </span>
              </label>
            ))}
          </>
        ) : (
          <>
            {filteredGroups.length === 0 && <p className="text-muted fst-italic">Tidak ada grup yang cocok.</p>}
            {filteredGroups.map((g) => (
              <label key={g._id} className="d-flex align-items-center gap-2 py-2 px-2 border-bottom" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selected.has(g.waJid)}
                  onChange={() => toggleOne(g.waJid)}
                />
                <span>
                  <span className="d-block">{g.name || g.waJid}</span>
                  {g.name && <span className="text-muted small">{g.waJid}</span>}
                </span>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

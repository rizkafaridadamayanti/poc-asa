import { useEffect, useMemo, useState } from "react"
import { Phone, Users, Search, CheckCheck } from "lucide-react"
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
      <div className="inline-flex rounded-xl bg-slate-100 p-1 mb-3">
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === "number" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setTab("number")}
        >
          <Phone className="w-3.5 h-3.5" />
          Nomor {numberCount > 0 && `(${numberCount})`}
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === "group" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setTab("group")}
        >
          <Users className="w-3.5 h-3.5" />
          Grup {groupCount > 0 && `(${groupCount})`}
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder={tab === "number" ? "Cari nama atau nomor…" : "Cari nama grup…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          onClick={tab === "number" ? toggleAllNumbers : toggleAllGroups}
          title="Pilih/batalkan semua"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {(tab === "number" ? allNumbersSelected : allGroupsSelected) ? "Batalkan semua" : "Pilih semua"}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
        {tab === "number" ? (
          <>
            {filteredParticipants.length === 0 && (
              <p className="text-slate-400 text-sm italic px-3 py-4">Tidak ada kontak yang cocok.</p>
            )}
            {filteredParticipants.map((p) => (
              <label
                key={p._id}
                className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={selected.has(p.waJid)}
                  onChange={() => toggleOne(p.waJid)}
                />
                <span className="text-sm">
                  <span className="block font-medium text-slate-800">{p.displayName || p.waJid.split("@")[0]}</span>
                  {p.displayName && <span className="text-slate-400 text-xs">{p.waJid.split("@")[0]}</span>}
                </span>
              </label>
            ))}
          </>
        ) : (
          <>
            {filteredGroups.length === 0 && (
              <p className="text-slate-400 text-sm italic px-3 py-4">Tidak ada grup yang cocok.</p>
            )}
            {filteredGroups.map((g) => (
              <label
                key={g._id}
                className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={selected.has(g.waJid)}
                  onChange={() => toggleOne(g.waJid)}
                />
                <span className="text-sm">
                  <span className="block font-medium text-slate-800">{g.name || g.waJid}</span>
                  {g.name && <span className="text-slate-400 text-xs">{g.waJid}</span>}
                </span>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

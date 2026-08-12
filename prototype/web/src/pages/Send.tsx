import { useEffect, useMemo, useState } from "react"
import { api, type Group, type Participant } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { Modal } from "../components/Modal.js"
import { NAV_COLORS } from "../navColors.js"

type Tab = "number" | "group"
type SendResult = { ok: string[]; failed: Array<{ jid: string; error: string }> }

function labelFor(jid: string, groups: Group[], participants: Participant[]): string {
  const g = groups.find((x) => x.waJid === jid)
  if (g) return g.name || g.waJid
  const p = participants.find((x) => x.waJid === jid)
  if (p) return p.displayName || p.waJid
  return jid
}

export function Send() {
  const [text, setText] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("number")
  const [search, setSearch] = useState("")

  const [groups, setGroups] = useState<Group[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.groups().then((res) => setGroups(res.groups)).catch(() => {})
    api.participants().then((res) => setParticipants(res.participants)).catch(() => {})
  }, [])

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) => (p.displayName || p.waJid).toLowerCase().includes(q) || p.waJid.toLowerCase().includes(q))
  }, [participants, search])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => (g.name || g.waJid).toLowerCase().includes(q) || g.waJid.toLowerCase().includes(q))
  }, [groups, search])

  const toggleOne = (set: Set<string>, setSet: (s: Set<string>) => void, jid: string) => {
    const next = new Set(set)
    if (next.has(jid)) next.delete(jid)
    else next.add(jid)
    setSet(next)
  }

  const allNumbersSelected = filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedNumbers.has(p.waJid))
  const toggleAllNumbers = () => {
    const next = new Set(selectedNumbers)
    if (allNumbersSelected) filteredParticipants.forEach((p) => next.delete(p.waJid))
    else filteredParticipants.forEach((p) => next.add(p.waJid))
    setSelectedNumbers(next)
  }

  const allGroupsSelected = filteredGroups.length > 0 && filteredGroups.every((g) => selectedGroups.has(g.waJid))
  const toggleAllGroups = () => {
    const next = new Set(selectedGroups)
    if (allGroupsSelected) filteredGroups.forEach((g) => next.delete(g.waJid))
    else filteredGroups.forEach((g) => next.add(g.waJid))
    setSelectedGroups(next)
  }

  const totalSelected = selectedNumbers.size + selectedGroups.size

  const openPicker = () => {
    setError(null)
    setSendResult(null)
    setPickerOpen(true)
  }

  const closePicker = () => {
    if (sending) return
    setPickerOpen(false)
  }

  const handleSend = async () => {
    const targets = [...selectedNumbers, ...selectedGroups]
    if (targets.length === 0 || !text.trim()) return
    setSending(true)
    setSendResult(null)
    const ok: string[] = []
    const failed: Array<{ jid: string; error: string }> = []
    for (let i = 0; i < targets.length; i++) {
      setProgress({ done: i, total: targets.length })
      try {
        await api.send(targets[i], text)
        ok.push(targets[i])
      } catch (err) {
        failed.push({ jid: targets[i], error: err instanceof Error ? err.message : String(err) })
      }
    }
    setProgress({ done: targets.length, total: targets.length })
    setSendResult({ ok, failed })
    setSending(false)
    if (failed.length === 0) {
      setText("")
      setSelectedNumbers(new Set())
      setSelectedGroups(new Set())
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Kirim Pesan" color={NAV_COLORS.send} title="Send WhatsApp Message" />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mx-auto" style={{ maxWidth: "480px" }}>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="text" className="form-label">
              Message
            </label>
            <textarea
              id="text"
              className="form-control"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message…"
              required
            />
          </div>
          <button className="btn btn-primary w-100" disabled={!text.trim()} onClick={openPicker}>
            <i className="bi bi-send me-1" />
            Kirim
          </button>
        </div>
      </div>

      {pickerOpen && (
        <Modal title="Pilih Penerima" onClose={closePicker} size="lg">
          {sendResult ? (
            <div>
              <div className={`alert ${sendResult.failed.length === 0 ? "alert-success" : "alert-warning"}`}>
                Terkirim ke {sendResult.ok.length} penerima
                {sendResult.failed.length > 0 && `, gagal ke ${sendResult.failed.length}`}.
              </div>
              {sendResult.failed.length > 0 && (
                <ul className="list-unstyled small text-danger mb-3">
                  {sendResult.failed.map((f) => (
                    <li key={f.jid}>
                      {labelFor(f.jid, groups, participants)}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setSendResult(null)}>
                  Kembali ke daftar
                </button>
                <button className="btn btn-primary" onClick={() => setPickerOpen(false)}>
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="btn-group mb-3">
                <button
                  className={`btn btn-sm ${tab === "number" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setTab("number")}
                >
                  <i className="bi bi-telephone me-1" />
                  Nomor {selectedNumbers.size > 0 && `(${selectedNumbers.size})`}
                </button>
                <button
                  className={`btn btn-sm ${tab === "group" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setTab("group")}
                >
                  <i className="bi bi-people me-1" />
                  Grup {selectedGroups.size > 0 && `(${selectedGroups.size})`}
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
                  {tab === "number"
                    ? allNumbersSelected
                      ? "Batalkan semua"
                      : "Pilih semua"
                    : allGroupsSelected
                      ? "Batalkan semua"
                      : "Pilih semua"}
                </button>
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {tab === "number" ? (
                  <>
                    {filteredParticipants.length === 0 && (
                      <p className="text-muted fst-italic">Tidak ada kontak yang cocok.</p>
                    )}
                    {filteredParticipants.map((p) => (
                      <label
                        key={p._id}
                        className="d-flex align-items-center gap-2 py-2 px-2 border-bottom"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedNumbers.has(p.waJid)}
                          onChange={() => toggleOne(selectedNumbers, setSelectedNumbers, p.waJid)}
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
                    {filteredGroups.length === 0 && (
                      <p className="text-muted fst-italic">Tidak ada grup yang cocok.</p>
                    )}
                    {filteredGroups.map((g) => (
                      <label
                        key={g._id}
                        className="d-flex align-items-center gap-2 py-2 px-2 border-bottom"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedGroups.has(g.waJid)}
                          onChange={() => toggleOne(selectedGroups, setSelectedGroups, g.waJid)}
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

              <div className="d-flex align-items-center justify-content-between mt-3">
                <span className="text-muted small">
                  {sending && progress
                    ? `Mengirim ${progress.done}/${progress.total}…`
                    : `${totalSelected} penerima dipilih`}
                </span>
                <button className="btn btn-primary" disabled={totalSelected === 0 || sending} onClick={handleSend}>
                  <i className="bi bi-send-fill me-1" />
                  {sending ? "Mengirim…" : `Kirim ke ${totalSelected} penerima`}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

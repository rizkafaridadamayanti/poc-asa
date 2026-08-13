import { useEffect, useMemo, useRef, useState } from "react"
import { Dropdown } from "bootstrap"
import { api, type Group, type GroupScope } from "../api.js"
import { NAV_COLORS } from "../navColors.js"

type Exchange = {
  id: string
  question: string
  answer: string | null
  sourceCount: number | null
  error: string | null
  pending: boolean
}

const SCOPE_LABEL: Record<GroupScope, string> = {
  pusat: "Pusat",
  dusun: "Dusun",
  anggota: "Anggota",
}
const SCOPE_ORDER: GroupScope[] = ["pusat", "dusun", "anggota"]

export function AiChatPanel({ groups }: { groups: Group[] }) {
  const [conversation, setConversation] = useState<Exchange[]>([])
  const [question, setQuestion] = useState("")
  const [scopeGroupJid, setScopeGroupJid] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scopeToggleRef = useRef<HTMLButtonElement>(null)

  const pickScope = (jid: string) => {
    setScopeGroupJid(jid)
    if (scopeToggleRef.current) Dropdown.getOrCreateInstance(scopeToggleRef.current).hide()
  }

  const groupsByScope = useMemo(() => {
    const map = new Map<GroupScope | "unset", Group[]>()
    for (const g of groups) {
      const key = g.scope ?? "unset"
      const list = map.get(key)
      if (list) list.push(g)
      else map.set(key, [g])
    }
    return map
  }, [groups])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [conversation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || sending) return

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    setConversation((prev) => [
      ...prev,
      { id, question: q, answer: null, sourceCount: null, error: null, pending: true },
    ])
    setQuestion("")
    setSending(true)
    try {
      const res = await api.askQuestion(q, scopeGroupJid || undefined)
      setConversation((prev) =>
        prev.map((ex) =>
          ex.id === id ? { ...ex, answer: res.answer, sourceCount: res.sourceMessageIds.length, pending: false } : ex,
        ),
      )
    } catch (err) {
      setConversation((prev) =>
        prev.map((ex) =>
          ex.id === id ? { ...ex, error: err instanceof Error ? err.message : String(err), pending: false } : ex,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title d-flex align-items-center gap-2 mb-1">
          <i className="bi bi-stars" style={{ color: NAV_COLORS.qa }} />
          Tanya AI
        </h5>
        <p className="text-muted small mb-3">
          Tanya berdasarkan riwayat chat yang boleh diakses Pusat. Anggota juga bisa DM bot dengan{" "}
          <code>/tanya &lt;pertanyaan&gt;</code>.
        </p>

        <div ref={scrollRef} className="ai-chat-scroll mb-3">
          {conversation.length === 0 && (
            <p className="text-muted fst-italic text-center my-4 mb-0">
              Belum ada percakapan. Coba tanya sesuatu di bawah.
            </p>
          )}
          {conversation.map((ex) => (
            <div key={ex.id} className="mb-3">
              <div className="d-flex justify-content-end mb-2">
                <div className="ai-chat-bubble ai-chat-bubble-user">{ex.question}</div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="ai-chat-avatar">
                  <i className="bi bi-stars" />
                </span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  {ex.pending && (
                    <div className="ai-chat-bubble ai-chat-bubble-ai text-muted">
                      <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true" />
                      Berpikir…
                    </div>
                  )}
                  {ex.error && <div className="ai-chat-bubble ai-chat-bubble-ai text-danger">{ex.error}</div>}
                  {ex.answer && (
                    <>
                      <div className="ai-chat-bubble ai-chat-bubble-ai" style={{ whiteSpace: "pre-wrap" }}>
                        {ex.answer}
                      </div>
                      <div className="text-muted small mt-1">Berdasarkan {ex.sourceCount} pesan sumber.</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ai-chat-composer">
            <div className={`dropup${scopeGroupJid ? " ai-chat-scope-chip" : ""}`}>
              <button
                ref={scopeToggleRef}
                type="button"
                className={scopeGroupJid ? "ai-chat-scope-chip-toggle" : "ai-chat-scope-btn"}
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title={scopeGroupJid ? "Ganti grup" : "Pilih grup"}
              >
                {scopeGroupJid ? (
                  <>
                    <i className="bi bi-people" />
                    <span>{groups.find((g) => g.waJid === scopeGroupJid)?.name || scopeGroupJid}</span>
                  </>
                ) : (
                  <i className="bi bi-plus-lg" />
                )}
              </button>
              {scopeGroupJid ? (
                <button
                  type="button"
                  className="ai-chat-scope-chip-clear"
                  title="Hapus filter grup"
                  onClick={() => setScopeGroupJid("")}
                >
                  <i className="bi bi-x-lg" />
                </button>
              ) : null}
              <ul className="dropdown-menu ai-chat-scope-menu" style={{ maxHeight: "280px", overflowY: "auto" }}>
                <li>
                  <button
                    type="button"
                    className={`dropdown-item${scopeGroupJid === "" ? " active" : ""}`}
                    onClick={() => pickScope("")}
                  >
                    <i className="bi bi-globe2" />
                    Semua grup
                  </button>
                </li>
                {SCOPE_ORDER.map((scope) => {
                  const list = groupsByScope.get(scope)
                  if (!list || list.length === 0) return null
                  return (
                    <li key={scope}>
                      <hr className="dropdown-divider" />
                      <h6 className="dropdown-header">{SCOPE_LABEL[scope]}</h6>
                      <ul className="list-unstyled mb-0">
                        {list.map((g) => (
                          <li key={g._id}>
                            <button
                              type="button"
                              className={`dropdown-item${scopeGroupJid === g.waJid ? " active" : ""}`}
                              onClick={() => pickScope(g.waJid)}
                            >
                              <i className="bi bi-people" />
                              {g.name || g.waJid}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
                {groupsByScope.get("unset")?.length ? (
                  <li>
                    <hr className="dropdown-divider" />
                    <h6 className="dropdown-header">Belum diatur</h6>
                    <ul className="list-unstyled mb-0">
                      {groupsByScope.get("unset")!.map((g) => (
                        <li key={g._id}>
                          <button
                            type="button"
                            className={`dropdown-item${scopeGroupJid === g.waJid ? " active" : ""}`}
                            onClick={() => pickScope(g.waJid)}
                          >
                            <i className="bi bi-people" />
                            {g.name || g.waJid}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            </div>
            <input
              className="form-control"
              placeholder="Tanya sesuatu, misal: apa keputusan rapat kemarin soal dana kegiatan?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={sending}
            />
            <button className="btn btn-primary rounded-circle flex-shrink-0" style={{ width: 36, height: 36, padding: 0 }} disabled={sending || !question.trim()}>
              <i className="bi bi-send-fill" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

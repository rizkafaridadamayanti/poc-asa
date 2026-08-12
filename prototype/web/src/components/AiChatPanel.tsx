import { useEffect, useRef, useState } from "react"
import { api, type Group } from "../api.js"
import { NAV_COLORS } from "../navColors.js"

type Exchange = {
  id: string
  question: string
  answer: string | null
  sourceCount: number | null
  error: string | null
  pending: boolean
}

export function AiChatPanel({ groups }: { groups: Group[] }) {
  const [conversation, setConversation] = useState<Exchange[]>([])
  const [question, setQuestion] = useState("")
  const [scopeGroupJid, setScopeGroupJid] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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
          <div className="d-flex flex-wrap gap-2 mb-2">
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: "260px" }}
              value={scopeGroupJid}
              onChange={(e) => setScopeGroupJid(e.target.value)}
              aria-label="Batasi ke satu grup"
            >
              <option value="">Semua grup</option>
              {groups.map((g) => (
                <option key={g._id} value={g.waJid}>
                  {g.name || g.waJid}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tanya sesuatu, misal: apa keputusan rapat kemarin soal dana kegiatan?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={sending}
            />
            <button className="btn btn-primary" disabled={sending || !question.trim()}>
              <i className="bi bi-send-fill" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

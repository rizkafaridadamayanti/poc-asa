import { useEffect, useMemo, useRef, useState } from "react"
import { Sparkles, Globe2, Users, ChevronDown, X, Send, Loader2 } from "lucide-react"
import { api, type Group, type GroupScope } from "../api.js"
import { NAV_COLORS } from "../navColors.js"
import { EmptyState } from "./EmptyState.js"

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
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scopeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) setScopeMenuOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const pickScope = (jid: string) => {
    setScopeGroupJid(jid)
    setScopeMenuOpen(false)
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4" style={{ color: NAV_COLORS.qa }} />
        Tanya AI
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Tanya berdasarkan riwayat chat yang boleh diakses Pusat. Anggota juga bisa DM bot dengan{" "}
        <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">/tanya &lt;pertanyaan&gt;</code>.
      </p>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto mb-3 pr-1">
        {conversation.length === 0 && (
          <EmptyState icon={Sparkles} text="Belum ada percakapan. Coba tanya sesuatu di bawah." />
        )}
        {conversation.map((ex) => (
          <div key={ex.id} className="mb-3">
            <div className="flex justify-end mb-2">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white text-sm px-3.5 py-2">
                {ex.question}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                {ex.pending && (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-500 text-sm px-3.5 py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Berpikir…
                  </div>
                )}
                {ex.error && (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-rose-50 text-rose-700 text-sm px-3.5 py-2">
                    {ex.error}
                  </div>
                )}
                {ex.answer && (
                  <>
                    <div
                      className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm px-3.5 py-2"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {ex.answer}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">Berdasarkan {ex.sourceCount} pesan sumber.</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <div className="relative" ref={scopeMenuRef}>
            <button
              type="button"
              onClick={() => setScopeMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                scopeGroupJid
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-slate-100 border-transparent text-slate-500 hover:text-slate-700"
              }`}
              title={scopeGroupJid ? "Ganti grup" : "Pilih grup"}
            >
              {scopeGroupJid ? (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span className="max-w-[90px] truncate">
                    {groups.find((g) => g.waJid === scopeGroupJid)?.name || scopeGroupJid}
                  </span>
                </>
              ) : (
                <>
                  <Globe2 className="w-3.5 h-3.5" />
                  Semua grup
                </>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {scopeGroupJid && (
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-slate-500"
                title="Hapus filter grup"
                onClick={() => setScopeGroupJid("")}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            {scopeMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-60 max-h-72 overflow-y-auto p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-xs">
                <button
                  type="button"
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2 font-semibold cursor-pointer ${
                    scopeGroupJid === "" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => pickScope("")}
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  Semua grup
                </button>
                {SCOPE_ORDER.map((scope) => {
                  const list = groupsByScope.get(scope)
                  if (!list || list.length === 0) return null
                  return (
                    <div key={scope} className="mt-1 pt-1 border-t border-slate-100">
                      <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {SCOPE_LABEL[scope]}
                      </div>
                      {list.map((g) => (
                        <button
                          key={g._id}
                          type="button"
                          className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2 font-semibold cursor-pointer ${
                            scopeGroupJid === g.waJid ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => pickScope(g.waJid)}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {g.name || g.waJid}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <input
            className="flex-1 h-9 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="Tanya sesuatu, misal: apa keputusan rapat kemarin?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={sending}
          />
          <button
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
            disabled={sending || !question.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

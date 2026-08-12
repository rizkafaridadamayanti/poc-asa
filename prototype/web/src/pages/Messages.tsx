import { useEffect, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { api, type Group, type Message } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

function shortJid(jid: string): string {
  const local = jid.split("@")[0] ?? jid
  return local.length > 12 ? `${local.slice(0, 6)}…${local.slice(-4)}` : local
}

export function Messages() {
  const { lastInbound } = useOutletContext<{ lastInbound: Record<string, unknown> | null }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [chatFilter, setChatFilter] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const limit = 20

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.messages(limit, newOffset, chatFilter || undefined, debouncedSearch || undefined)
      setMessages(res.messages)
      setTotal(res.total)
      setOffset(res.offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFilter, debouncedSearch])

  useEffect(() => {
    api
      .groups()
      .then((res) => setGroups(res.groups))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!lastInbound) return
    const msg = lastInbound as unknown as Message
    if (chatFilter && msg.chatJid !== chatFilter) return
    setMessages((prev) => {
      if (prev.some((m) => m.messageId === msg.messageId)) return prev
      const group = groups.find((g) => g.waJid === msg.chatJid)
      return [{ ...msg, chatName: group?.name || null }, ...prev]
    })
    setTotal((t) => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInbound])

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString()
  const hasFilters = chatFilter !== "" || search !== ""
  const clearFilters = () => {
    setChatFilter("")
    setSearch("")
  }

  return (
    <div>
      <PageHeader eyebrow="Pesan Masuk" color={NAV_COLORS.messages} title="Messages" />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="chatFilter" className="form-label">
                Chat / Group
              </label>
              <select
                id="chatFilter"
                className="form-select"
                value={chatFilter}
                onChange={(e) => setChatFilter(e.target.value)}
              >
                <option value="">All chats</option>
                {groups.map((g) => (
                  <option key={g._id} value={g.waJid}>
                    {g.name || g.waJid}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="search" className="form-label">
                Cari pesan
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  id="search"
                  type="search"
                  className="form-control"
                  placeholder="Cari isi pesan atau pengirim…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                <i className="bi bi-x-lg me-1" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-muted">Loading messages…</p>}
      {!loading && messages.length === 0 && (
        <p className="text-muted fst-italic">
          {hasFilters ? "Tidak ada pesan yang cocok dengan filter." : "No messages yet."}
        </p>
      )}
      {messages.length > 0 && (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th className="text-nowrap">Time</th>
                    <th className="text-nowrap">From</th>
                    <th className="text-nowrap">Chat</th>
                    <th>Text</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m._id}>
                      <td className="text-nowrap text-muted small">{formatDate(m.timestamp)}</td>
                      <td className="text-nowrap" title={m.fromJid}>
                        {shortJid(m.fromJid)}
                      </td>
                      <td className="text-nowrap">
                        {m.isGroup ? (
                          <span title={m.chatJid}>{m.chatName || shortJid(m.chatJid)}</span>
                        ) : (
                          <span>
                            <span className="badge text-bg-secondary me-1">Personal</span>
                            <span className="text-muted small" title={m.chatJid}>
                              {shortJid(m.chatJid)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="text-truncate" style={{ maxWidth: "480px" }} title={m.text}>
                        {m.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-center gap-3 mt-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset === 0 || loading}
              onClick={() => load(Math.max(offset - limit, 0))}
            >
              <i className="bi bi-chevron-left" /> Previous
            </button>
            <span className="text-muted small">
              {offset + 1}–{Math.min(offset + messages.length, total)} of {total}
            </span>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={offset + messages.length >= total || loading}
              onClick={() => load(offset + limit)}
            >
              Next <i className="bi bi-chevron-right" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

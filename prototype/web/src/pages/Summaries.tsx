import { useEffect, useState } from "react"
import { api, type Group, type Summary } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { AiChatPanel } from "../components/AiChatPanel.js"
import { Modal } from "../components/Modal.js"
import { truncateWords } from "../messageUtils.js"
import { NAV_COLORS } from "../navColors.js"

type DigestResult = { summaryId: string; bodyMd: string; messageCount: number; waMessageId?: string }
type ViewMode = "active" | "trash"

export function Summaries() {
  const [viewMode, setViewMode] = useState<ViewMode>("active")
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const limit = 10

  const [groups, setGroups] = useState<Group[]>([])
  const [groupFilter, setGroupFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [keywordFilter, setKeywordFilter] = useState("")

  const [digestLoading, setDigestLoading] = useState(false)
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null)

  const [viewingSummary, setViewingSummary] = useState<Summary | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async (newOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.summaries(
        limit,
        newOffset,
        {
          groupJid: groupFilter || undefined,
          from: fromFilter || undefined,
          to: toFilter || undefined,
          keyword: keywordFilter || undefined,
        },
        viewMode === "trash",
      )
      setSummaries(res.summaries)
      setTotal(res.total)
      setOffset(res.offset)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  useEffect(() => {
    api
      .groups()
      .then((res) => setGroups(res.groups))
      .catch(() => {})
  }, [])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    load(0)
  }

  const switchView = (mode: ViewMode) => {
    setViewMode(mode)
    setInfo(null)
    setError(null)
  }

  const runDigest = async (last24h: boolean) => {
    setDigestLoading(true)
    setError(null)
    setDigestResult(null)
    try {
      const res = await api.digest(last24h)
      setDigestResult(res)
      if (viewMode === "active") await load(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDigestLoading(false)
    }
  }

  const toggle = async (s: Summary, field: "read" | "important" | "trash") => {
    try {
      await api.updateSummary(s._id, { [field]: !s[field] })
      if (field === "trash") {
        setSummaries((prev) => prev.filter((x) => x._id !== s._id))
        setTotal((t) => Math.max(t - 1, 0))
        setInfo(viewMode === "active" ? "Ringkasan dipindahkan ke Riwayat." : "Ringkasan dipulihkan.")
      } else {
        await load(offset)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeletePermanent = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.deleteSummaryPermanent(id)
      setSummaries((prev) => prev.filter((s) => s._id !== id))
      setTotal((t) => Math.max(t - 1, 0))
      setInfo("Ringkasan dihapus permanen.")
      setConfirmingDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const exportDocx = async (s: Summary) => {
    try {
      const blob = await api.exportSummary(s._id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `summary-${s._id}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const groupName = (jid: string) => groups.find((g) => g.waJid === jid)?.name || jid

  return (
    <div>
      <PageHeader
        eyebrow="Ringkasan Harian"
        color={NAV_COLORS.summaries}
        title="Summaries"
        subtitle={
          <>
            Catatan dominasi bicara (meeting-bias) di bawah ini adalah <strong>signal</strong>,
            bukan vonis — pakai sebagai bahan diskusi, bukan penilaian final.
          </>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <AiChatPanel groups={groups} />

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title d-flex align-items-center gap-2">
            <i className="bi bi-envelope-paper" style={{ color: NAV_COLORS.digest }} />
            Run Digest
          </h5>
          <p className="text-muted small">
            Summarize yesterday's messages from <code>TEST_GROUP_JID</code> and send the result to{" "}
            <code>REPORT_TO_JID</code>. The result is added to the list below.
          </p>
          {digestResult && (
            <div className="alert alert-success">
              Digest created ({digestResult.messageCount} messages). WA message ID:{" "}
              {digestResult.waMessageId ?? "n/a"}
            </div>
          )}
          <div className="d-flex gap-2">
            <button className="btn btn-primary" disabled={digestLoading} onClick={() => runDigest(false)}>
              <i className="bi bi-play-fill me-1" />
              {digestLoading ? "Running…" : "Run Yesterday"}
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={digestLoading}
              onClick={() => runDigest(true)}
            >
              Run Last 24h
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="segmented-tabs">
          <button
            type="button"
            className={`segmented-tab${viewMode === "active" ? " active" : ""}`}
            onClick={() => switchView("active")}
          >
            <i className="bi bi-journal-text" />
            Ringkasan Aktif
          </button>
          <button
            type="button"
            className={`segmented-tab${viewMode === "trash" ? " active" : ""}`}
            onClick={() => switchView("trash")}
          >
            <i className="bi bi-clock-history" />
            Riwayat
          </button>
        </div>
      </div>

      <form onSubmit={applyFilters} className="card mb-4">
        <div className="card-body row g-3 align-items-end">
          <div className="col-sm-3">
            <label htmlFor="groupFilter" className="form-label">
              Group
            </label>
            <select
              id="groupFilter"
              className="form-select"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g._id} value={g.waJid}>
                  {g.name || g.waJid}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-2">
            <label htmlFor="fromFilter" className="form-label">
              From
            </label>
            <input
              id="fromFilter"
              type="date"
              className="form-control"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-2">
            <label htmlFor="toFilter" className="form-label">
              To
            </label>
            <input
              id="toFilter"
              type="date"
              className="form-control"
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-3">
            <label htmlFor="keywordFilter" className="form-label">
              Keyword
            </label>
            <input
              id="keywordFilter"
              className="form-control"
              placeholder="search body…"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
            />
          </div>
          <div className="col-sm-2">
            <button className="btn btn-primary w-100" disabled={loading}>
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {loading && <p className="text-muted">Loading summaries…</p>}
      {!loading && summaries.length === 0 && (
        <p className="text-muted fst-italic">
          {viewMode === "trash" ? "Riwayat kosong." : "No summaries yet."}
        </p>
      )}
      {summaries.map((s) => (
        <div key={s._id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <strong>
                {new Date(s.periodStart).toLocaleDateString()} —{" "}
                {new Date(s.periodEnd).toLocaleDateString()}
              </strong>
              <span className="text-muted small">{s.sourceMessageIds.length} messages</span>
            </div>
            <p className="text-muted mb-3">{truncateWords(s.bodyMd, 40, 320)}</p>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setViewingSummary(s)}
              >
                <i className="bi bi-eye me-1" />
                Lihat Detail
              </button>
              {viewMode === "active" ? (
                <>
                  <button
                    className={`btn btn-sm ${s.important ? "btn-warning" : "btn-outline-secondary"}`}
                    onClick={() => toggle(s, "important")}
                  >
                    <i className="bi bi-star me-1" />
                    {s.important ? "Unmark important" : "Mark important"}
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => toggle(s, "trash")}>
                    <i className="bi bi-trash me-1" />
                    Hapus
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline-success btn-sm" onClick={() => toggle(s, "trash")}>
                    <i className="bi bi-arrow-counterclockwise me-1" />
                    Pulihkan
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setConfirmingDeleteId(s._id)}
                    disabled={busyId === s._id}
                  >
                    <i className="bi bi-trash3 me-1" />
                    Hapus Permanen
                  </button>
                </>
              )}
              <button className="btn btn-outline-secondary btn-sm" onClick={() => exportDocx(s)}>
                <i className="bi bi-file-earmark-word me-1" />
                Export .docx
              </button>
            </div>
          </div>
        </div>
      ))}
      {summaries.length > 0 && (
        <div className="d-flex align-items-center gap-3 mt-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={offset === 0 || loading}
            onClick={() => load(Math.max(offset - limit, 0))}
          >
            <i className="bi bi-chevron-left" /> Previous
          </button>
          <span className="text-muted small">
            {offset + 1}–{Math.min(offset + summaries.length, total)} of {total}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={offset + summaries.length >= total || loading}
            onClick={() => load(offset + limit)}
          >
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}

      {viewingSummary && (
        <Modal title="Detail Ringkasan" onClose={() => setViewingSummary(null)} size="lg">
          <dl className="row mb-3">
            <dt className="col-3">Periode</dt>
            <dd className="col-9">
              {new Date(viewingSummary.periodStart).toLocaleString()} —{" "}
              {new Date(viewingSummary.periodEnd).toLocaleString()}
            </dd>
            <dt className="col-3">Grup</dt>
            <dd className="col-9">{groupName(viewingSummary.sourceGroupJid)}</dd>
            <dt className="col-3">Jumlah pesan</dt>
            <dd className="col-9">{viewingSummary.sourceMessageIds.length}</dd>
            <dt className="col-3">Status</dt>
            <dd className="col-9">
              {viewingSummary.read && <span className="badge text-bg-secondary me-1">Read</span>}
              {viewingSummary.important && <span className="badge text-bg-warning me-1">Important</span>}
              {!viewingSummary.read && !viewingSummary.important && <span className="text-muted">—</span>}
            </dd>
          </dl>
          <div className="markdown-body">
            <pre className="bg-body-tertiary p-3 rounded">{viewingSummary.bodyMd}</pre>
          </div>
        </Modal>
      )}

      {confirmingDeleteId && (
        <Modal
          title="Hapus permanen?"
          onClose={() => setConfirmingDeleteId(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setConfirmingDeleteId(null)}>
                Batal
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeletePermanent(confirmingDeleteId)}
                disabled={busyId === confirmingDeleteId}
              >
                {busyId === confirmingDeleteId ? "Menghapus…" : "Ya, hapus permanen"}
              </button>
            </>
          }
        >
          <p className="mb-0 text-danger">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            Ringkasan ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  )
}

import { useState } from "react"
import { api } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { NAV_COLORS } from "../navColors.js"

export function QA() {
  const [question, setQuestion] = useState("")
  const [scopeGroupJid, setScopeGroupJid] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ answer: string; sourceMessageIds: string[] } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.askQuestion(question, scopeGroupJid.trim() || undefined)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon="bi-question-circle"
        color={NAV_COLORS.qa}
        title="Tanya Jawab"
        subtitle={
          <>
            Tanya berdasarkan riwayat chat yang boleh diakses Pusat. Anggota juga bisa DM bot
            dengan <code>/tanya &lt;pertanyaan&gt;</code>.
          </>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="card mb-4" style={{ maxWidth: "560px" }}>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="question" className="form-label">
              Question
            </label>
            <textarea
              id="question"
              className="form-control"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Apa keputusan rapat kemarin soal dana kegiatan?"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="scopeGroupJid" className="form-label">
              Batasi ke satu grup (opsional)
            </label>
            <input
              id="scopeGroupJid"
              className="form-control"
              value={scopeGroupJid}
              onChange={(e) => setScopeGroupJid(e.target.value)}
              placeholder="120363xxxxxxxxxxxx@g.us"
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            <i className="bi bi-search me-1" />
            {loading ? "Mencari jawaban…" : "Tanya"}
          </button>
        </div>
      </form>

      {result && (
        <div className="card" style={{ maxWidth: "560px" }}>
          <div className="card-body">
            <h5 className="card-title">Jawaban</h5>
            <p style={{ whiteSpace: "pre-wrap" }}>{result.answer}</p>
            <p className="text-muted small mt-3 mb-0">
              Berdasarkan {result.sourceMessageIds.length} pesan sumber.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

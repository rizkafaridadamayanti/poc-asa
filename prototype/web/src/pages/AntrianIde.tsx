import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Lightbulb, CheckCircle2, Clock, Shield, ArrowRight } from "lucide-react"
import { api, type AnonymousIdea } from "../api.js"

export function AntrianIde() {
  const navigate = useNavigate()
  const [ideas, setIdeas] = useState<AnonymousIdea[]>([])
  const [filter, setFilter] = useState<"new" | "reviewed" | "all">("new")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.anonymousIdeas(filter === "all" ? undefined : filter)
      setIdeas(res.ideas)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const markReviewed = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.markIdeaReviewed(id)
      setIdeas((prev) => prev.filter((i) => i._id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  const raiseAsBroadcast = (idea: AnonymousIdea) => {
    navigate("/informasi-baru", { state: { prefillBody: idea.text } })
  }

  const countNew = ideas.filter((i) => i.status === "new").length

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span>Antrian Ide Anonim</span>
          {filter === "new" && countNew > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {countNew} Usulan Baru
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kanal privat untuk anggota yang tidak nyaman usul di grup terbuka — kirim DM ke bot dengan{" "}
          <code className="text-blue-600 font-mono font-bold">/ide &lt;teks&gt;</code>. Identitas pengirim tidak pernah disimpan.
        </p>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-2">
        {[
          { id: "new" as const, label: "Baru" },
          { id: "reviewed" as const, label: "Ditinjau" },
          { id: "all" as const, label: "Semua" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === tab.id ? "bg-blue-600 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-8">Memuat…</p>
        ) : ideas.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500 space-y-2">
            <Lightbulb className="w-10 h-10 mx-auto opacity-30 text-blue-600" />
            <p className="font-bold text-slate-800">{filter === "new" ? "Belum ada ide baru." : "Tidak ada data untuk filter ini."}</p>
          </div>
        ) : (
          ideas.map((idea) => (
            <div key={idea._id} className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md shadow-xs space-y-3.5 flex flex-col justify-between transition-all group">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {idea.status === "new" ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Baru Masuk</span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">✓ Telah Ditinjau</span>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(idea.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">"{idea.text}"</p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Anonim Terlindungi — ID pengirim tidak tersimpan
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => raiseAsBroadcast(idea)}
                  className="text-xs text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Jadikan draft Kelola Pesan"
                >
                  Angkat jadi Broadcast
                  <ArrowRight className="w-3 h-3" />
                </button>
                {idea.status === "new" && (
                  <button
                    onClick={() => markReviewed(idea._id)}
                    disabled={busyId === idea._id}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tandai Ditinjau
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

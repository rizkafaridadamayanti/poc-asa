import { useEffect, useState } from "react"
import { MessageSquare, Lightbulb, Clock, Users, Layers } from "lucide-react"
import { api, type ContributiveRow, type PeakHourRow, type DusunRow } from "../api.js"

export function Infografis() {
  const [contributive, setContributive] = useState<ContributiveRow[]>([])
  const [peakHours, setPeakHours] = useState<PeakHourRow[]>([])
  const [dusun, setDusun] = useState<DusunRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.contributiveStats(), api.peakHours(), api.dusunStats()])
      .then(([c, p, d]) => {
        setContributive(c.rows)
        setPeakHours(p.rows)
        setDusun(d.rows)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  const maxHourCount = Math.max(1, ...peakHours.map((r) => r.count))
  const yAxisTicks = [maxHourCount, Math.round(maxHourCount * 0.75), Math.round(maxHourCount * 0.5), Math.round(maxHourCount * 0.25), 0]
  const totalGroupsInDusun = Math.max(1, dusun.reduce((s, r) => s + r.groupCount, 0))

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <span>Infografis</span>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
            Statistik &amp; Insight
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Analitik visual data percakapan WhatsApp Karang Taruna.</p>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {loading && <p className="text-slate-400 text-sm">Memuat statistik…</p>}

      {!loading && (
        <>
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Peak Chat Hours</h2>
                  <p className="text-xs text-slate-500">Volume pesan masuk per jam, 24 jam terakhir</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-400" /> Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Puncak
                </span>
              </div>
            </div>

            {peakHours.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">Belum ada data pesan.</p>
            ) : (
              <div className="pt-4 flex items-stretch gap-3 h-64">
                <div className="flex flex-col justify-between text-right text-[10px] font-mono font-bold text-slate-400 pr-2 border-r border-slate-100 select-none pb-6">
                  {yAxisTicks.map((tick, i) => (
                    <span key={i}>{tick}</span>
                  ))}
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <div className="flex-1 flex items-end justify-between gap-1 sm:gap-1.5 pb-2 border-b border-slate-100">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const row = peakHours.find((r) => r.hour === hour)
                      const count = row?.count ?? 0
                      const heightPercent = Math.round((count / maxHourCount) * 100)
                      const isVeryHigh = count >= maxHourCount * 0.65
                      const isModerate = count >= maxHourCount * 0.35
                      return (
                        <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer">
                          <div className="absolute -top-12 hidden group-hover:flex flex-col items-center px-2 py-1.5 bg-slate-900 text-white rounded-lg shadow-xl z-30 pointer-events-none whitespace-nowrap text-[10px]">
                            <span className="font-bold text-blue-300">{hour}:00 WIB</span>
                            <span><strong>{count}</strong> pesan</span>
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isVeryHigh ? "bg-blue-600" : isModerate ? "bg-blue-400" : "bg-slate-200 hover:bg-slate-300"
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 text-[9px] font-mono text-slate-400">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <span key={hour} className={`flex-1 text-center truncate ${hour % 3 === 0 ? "opacity-100 font-bold text-slate-700" : "opacity-40 hidden sm:inline"}`}>
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Active vs Contributive Participants</h2>
                <p className="text-xs text-slate-500">Volume chat vs pesan bertanda ide/gagasan</p>
              </div>
            </div>
            {contributive.length === 0 ? (
              <p className="text-slate-400 text-sm py-6 text-center">Belum ada pesan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Partisipan</th>
                      <th className="py-3 px-4 text-center">
                        <span className="flex items-center justify-center gap-1"><MessageSquare className="w-3 h-3 text-blue-600" /> Pesan</span>
                      </th>
                      <th className="py-3 px-4 text-center">
                        <span className="flex items-center justify-center gap-1"><Lightbulb className="w-3 h-3 text-amber-500" /> Bertanda Ide</span>
                      </th>
                      <th className="py-3 px-4 text-center">Rasio Ide</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contributive.map((r) => {
                      const ratio = r.messageCount > 0 ? (r.ideaCount / r.messageCount) * 100 : 0
                      return (
                        <tr key={r.waJid} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono">{r.waJid.split("@")[0]}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-700 text-center">{r.messageCount}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-600 text-center">{r.ideaCount}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }} />
                              </div>
                              <span className="font-mono text-[11px] text-slate-700 font-bold">{ratio.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Groups by Dusun</h2>
                <p className="text-xs text-slate-500">Persebaran grup WhatsApp per dusun</p>
              </div>
            </div>
            {dusun.length === 0 ? (
              <p className="text-slate-400 text-sm py-6 text-center">Belum ada grup yang diatur ke dusun.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dusun.map((r) => (
                  <div key={r.dusunId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-slate-900 text-xs">{r.dusunId}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-xs">
                        {r.groupCount} Grup
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(r.groupCount / totalGroupsInDusun) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

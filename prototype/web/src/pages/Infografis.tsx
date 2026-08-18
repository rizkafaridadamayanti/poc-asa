import { useEffect, useState } from "react"
import { api, type ContributiveRow, type PeakHourRow, type DusunRow } from "../api.js"
import { PageHeader } from "../components/PageHeader.js"
import { EmptyState } from "../components/EmptyState.js"
import { NAV_COLORS } from "../navColors.js"

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
  const yAxisLabels = [
    maxHourCount,
    Math.round(maxHourCount * 0.75),
    Math.round(maxHourCount * 0.5),
    Math.round(maxHourCount * 0.25),
    0,
  ]

  return (
    <div>
      <PageHeader eyebrow="Statistik & Insight" color={NAV_COLORS.infografis} title="Infografis" />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading stats…</p>}

      {!loading && (
        <>
          <div className="d-flex flex-column flex-lg-row gap-3 mb-4 align-items-stretch">
            <div className="flex-fill" style={{ minWidth: 0 }}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Peak chat hours</h5>
                  {peakHours.length === 0 ? (
                    <EmptyState icon="bi-bar-chart" text="Belum ada data pesan." />
                  ) : (
                    <>
                      <div className="chat-hour-chart-row">
                        <div className="chat-hour-yaxis">
                          {yAxisLabels.map((v, i) => (
                            <span key={i}>{v}</span>
                          ))}
                        </div>
                        <div className="chat-hour-plot">
                          <div className="chat-hour-gridlines">
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="chat-hour-bars">
                            {Array.from({ length: 24 }, (_, hour) => {
                              const row = peakHours.find((r) => r.hour === hour)
                              const count = row?.count ?? 0
                              return (
                                <div key={hour} className="flex-fill text-center chat-hour-bar-wrap">
                                  <span className="chat-hour-tooltip">
                                    {hour}:00 — {count} pesan
                                  </span>
                                  <div
                                    className="chat-hour-bar mx-auto"
                                    style={{
                                      height: `${Math.max((count / maxHourCount) * 120, count > 0 ? 2 : 0)}px`,
                                      width: "70%",
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="chat-hour-xaxis">
                        {Array.from({ length: 24 }, (_, hour) => (
                          <span key={hour} className="flex-fill text-center text-muted" style={{ fontSize: "0.65rem" }}>
                            {hour}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-fill" style={{ minWidth: 0 }}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Active vs contributive</h5>
                  {contributive.length === 0 && <EmptyState icon="bi-people" text="Belum ada pesan." />}
                  {contributive.length > 0 && (
                    <div className="stat-table">
                      <div className="stat-row-header">
                        <span>Participant</span>
                        <span>Aktivitas</span>
                      </div>
                      {contributive.map((r) => (
                        <div key={r.waJid} className="stat-row">
                          <span className="stat-row-label">
                            <span className="stat-row-icon stat-row-icon-participant">
                              <i className="bi bi-person" />
                            </span>
                            {r.waJid.split("@")[0]}
                          </span>
                          <span className="d-flex gap-2">
                            <span
                              className={`stat-pill${r.messageCount > 0 ? " stat-pill-accent" : ""}`}
                              title="Total pesan"
                            >
                              <i className="bi bi-chat-dots" />
                              {r.messageCount}
                            </span>
                            <span
                              className={`stat-pill${r.ideaCount > 0 ? " stat-pill-accent" : ""}`}
                              title="Pesan bertanda ide"
                            >
                              <i className="bi bi-lightbulb" />
                              {r.ideaCount}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Groups by dusun</h5>
              {dusun.length === 0 && (
                <EmptyState icon="bi-geo-alt-fill" text="Belum ada grup yang diatur ke dusun." />
              )}
              {dusun.length > 0 && (
                <div className="stat-table">
                  <div className="stat-row-header">
                    <span>Dusun</span>
                    <span>Jumlah grup</span>
                  </div>
                  {dusun.map((r) => (
                    <div key={r.dusunId} className="stat-row">
                      <span className="stat-row-label">
                        <span className="stat-row-icon">
                          <i className="bi bi-geo-alt-fill" />
                        </span>
                        {r.dusunId}
                      </span>
                      <span className="stat-pill">{r.groupCount} grup</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
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

  return (
    <div>
      <h2 className="mb-4">Infografis</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-muted">Loading stats…</p>}

      {!loading && (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Peak chat hours</h5>
              <div className="d-flex align-items-end gap-1" style={{ height: "120px" }}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const row = peakHours.find((r) => r.hour === hour)
                  const count = row?.count ?? 0
                  return (
                    <div
                      key={hour}
                      className="flex-fill text-center"
                      title={`${hour}:00 — ${count} pesan`}
                    >
                      <div
                        className="bg-primary rounded-top mx-auto"
                        style={{ height: `${(count / maxHourCount) * 100}px`, width: "70%" }}
                      />
                      <span className="text-muted" style={{ fontSize: "0.65rem" }}>
                        {hour}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Active vs contributive</h5>
              {contributive.length === 0 && <p className="text-muted fst-italic mb-0">No messages yet.</p>}
              {contributive.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Messages (active)</th>
                        <th>Ideas tagged (contributive)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributive.map((r) => (
                        <tr key={r.waJid}>
                          <td>{r.waJid.split("@")[0]}</td>
                          <td>{r.messageCount}</td>
                          <td>{r.ideaCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Groups by dusun</h5>
              {dusun.length === 0 && <p className="text-muted fst-italic mb-0">No dusun assigned to any group yet.</p>}
              {dusun.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Dusun</th>
                        <th>Groups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dusun.map((r) => (
                        <tr key={r.dusunId}>
                          <td>{r.dusunId}</td>
                          <td>{r.groupCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

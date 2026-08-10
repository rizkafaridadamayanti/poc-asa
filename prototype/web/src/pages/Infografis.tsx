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
      <h2 className="page-title">Infografis</h2>
      {error && <div className="alert error">{error}</div>}
      {loading && <p className="loading">Loading stats…</p>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3>Peak chat hours</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "120px" }}>
              {Array.from({ length: 24 }, (_, hour) => {
                const row = peakHours.find((r) => r.hour === hour)
                const count = row?.count ?? 0
                return (
                  <div key={hour} style={{ flex: 1, textAlign: "center" }} title={`${hour}:00 — ${count} pesan`}>
                    <div
                      style={{
                        height: `${(count / maxHourCount) * 100}px`,
                        background: "var(--accent, #4f46e5)",
                        borderRadius: "2px",
                      }}
                    />
                    <span style={{ fontSize: "0.65rem" }}>{hour}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3>Active vs contributive</h3>
            {contributive.length === 0 && <p className="empty">No messages yet.</p>}
            {contributive.length > 0 && (
              <table>
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
            )}
          </div>

          <div className="card">
            <h3>Groups by dusun</h3>
            {dusun.length === 0 && <p className="empty">No dusun assigned to any group yet.</p>}
            {dusun.length > 0 && (
              <table>
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
            )}
          </div>
        </>
      )}
    </div>
  )
}

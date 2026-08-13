import cron, { type ScheduledTask } from "node-cron"
import { getContributiveStats, getPeakHours, getGroupsByDusun } from "./stats.js"
import { sendOutbound } from "./sender.js"
import { getSettings } from "./settings.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type WeeklyStatsCronDeps = {
  schedule: string
  bridge: WaBridge
  log: Logger
}

function formatWeeklyStatsText(
  contributive: Awaited<ReturnType<typeof getContributiveStats>>,
  peakHours: Awaited<ReturnType<typeof getPeakHours>>,
  dusun: Awaited<ReturnType<typeof getGroupsByDusun>>,
): string {
  const topPeak = [...peakHours].sort((a, b) => b.count - a.count).slice(0, 3)
  const peakLine =
    topPeak.length > 0
      ? topPeak.map((r) => `${String(r.hour).padStart(2, "0")}:00 (${r.count} pesan)`).join(", ")
      : "belum ada data"

  const topContributive = [...contributive].sort((a, b) => b.messageCount - a.messageCount).slice(0, 5)
  const contributiveLines =
    topContributive.length > 0
      ? topContributive
          .map((r, i) => `${i + 1}. ${r.waJid.split("@")[0]} — ${r.messageCount} pesan, ${r.ideaCount} ide`)
          .join("\n")
      : "belum ada data"

  const dusunLines =
    dusun.length > 0 ? dusun.map((r) => `${r.dusunId}: ${r.groupCount} grup`).join("\n") : "belum ada dusun terdaftar"

  return [
    "*Statistik Mingguan Karang Taruna*",
    "",
    "Jam tersibuk chat:",
    peakLine,
    "",
    "Top partisipan (pesan & ide):",
    contributiveLines,
    "",
    "Grup per dusun:",
    dusunLines,
    "",
    "Signal, bukan vonis — pakai sebagai bahan diskusi Pusat, bukan penilaian final.",
  ].join("\n")
}

export function startWeeklyStatsCron(deps: WeeklyStatsCronDeps): ScheduledTask {
  const { schedule, bridge, log } = deps
  const task = cron.schedule(schedule, () => {
    if (!bridge.isConnected()) {
      log.warn("weekly stats cron skipped: WA not connected")
      return
    }
    void (async () => {
      try {
        const [contributive, peakHours, dusun] = await Promise.all([
          getContributiveStats(),
          getPeakHours(),
          getGroupsByDusun(),
        ])
        const text = formatWeeklyStatsText(contributive, peakHours, dusun)
        const { reportToJid } = getSettings()
        await sendOutbound(bridge, reportToJid, text, "weekly-stats")
        log.info("weekly stats cron completed")
      } catch (err) {
        log.error({ err }, "weekly stats cron failed")
      }
    })()
  })
  log.info({ schedule }, "weekly stats cron scheduled")
  return task
}

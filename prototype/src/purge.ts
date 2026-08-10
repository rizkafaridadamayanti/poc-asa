import { SummaryModel } from "./models/summary.js"
import type { Logger } from "./logger.js"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export async function purgeOldTrash(log: Logger): Promise<number> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)
  const res = await SummaryModel.deleteMany({
    trash: true,
    trashedAt: { $ne: null, $lte: cutoff },
  })
  if (res.deletedCount) {
    log.info({ deletedCount: res.deletedCount }, "purged old trashed summaries")
  }
  return res.deletedCount ?? 0
}

export function startPurgeJob(log: Logger): NodeJS.Timeout {
  const timer = setInterval(() => {
    purgeOldTrash(log).catch((err) => log.error({ err }, "purge job failed"))
  }, CHECK_INTERVAL_MS)
  timer.unref()
  return timer
}

import fs from "node:fs/promises"
import path from "node:path"
import { SummaryModel } from "./models/summary.js"
import { MessageModel } from "./models/message.js"
import type { Logger } from "./logger.js"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export async function purgeOldTrash(log: Logger, mediaDir: string): Promise<number> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)

  const res = await SummaryModel.deleteMany({
    trash: true,
    trashedAt: { $ne: null, $lte: cutoff },
  })
  if (res.deletedCount) {
    log.info({ deletedCount: res.deletedCount }, "purged old trashed summaries")
  }

  const oldMessages = await MessageModel.find(
    { trash: true, trashedAt: { $ne: null, $lte: cutoff } },
    { mediaFilename: 1 },
  ).lean()
  if (oldMessages.length > 0) {
    await Promise.all(
      oldMessages
        .filter((m) => m.mediaFilename)
        .map((m) => fs.rm(path.join(mediaDir, m.mediaFilename as string), { force: true }).catch(() => {})),
    )
    await MessageModel.deleteMany({ _id: { $in: oldMessages.map((m) => m._id) } })
    log.info({ deletedCount: oldMessages.length }, "purged old trashed messages")
  }

  return (res.deletedCount ?? 0) + oldMessages.length
}

export function startPurgeJob(log: Logger, mediaDir: string): NodeJS.Timeout {
  const timer = setInterval(() => {
    purgeOldTrash(log, mediaDir).catch((err) => log.error({ err }, "purge job failed"))
  }, CHECK_INTERVAL_MS)
  timer.unref()
  return timer
}

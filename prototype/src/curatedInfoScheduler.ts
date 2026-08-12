import { CuratedInfoModel } from "./models/curated_info.js"
import { fanOutCuratedInfo } from "./curation.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type CuratedInfoScheduler = { stop: () => void }

async function fireDueCuratedInfos(bridge: WaBridge, log: Logger): Promise<void> {
  if (!bridge.isConnected()) return

  const due = await CuratedInfoModel.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
    trash: { $ne: true },
  }).lean()

  for (const doc of due) {
    try {
      await fanOutCuratedInfo(String(doc._id), bridge, log)
      log.info({ id: String(doc._id) }, "scheduled curated info sent")
    } catch (err) {
      log.error({ err, id: String(doc._id) }, "scheduled curated info send failed")
    }
  }
}

export function startCuratedInfoScheduler(
  bridge: WaBridge,
  log: Logger,
  intervalMs = 60_000,
): CuratedInfoScheduler {
  const tick = () => {
    fireDueCuratedInfos(bridge, log).catch((err) => log.error({ err }, "curated info scheduler tick failed"))
  }
  tick()
  const handle = setInterval(tick, intervalMs)
  return { stop: () => clearInterval(handle) }
}

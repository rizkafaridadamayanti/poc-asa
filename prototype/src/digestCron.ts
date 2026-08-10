import cron, { type ScheduledTask } from "node-cron"
import { runDigest } from "./digest.js"
import { getSettings } from "./settings.js"
import type { LlmClient } from "./llm.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type DigestCronDeps = {
  schedule: string
  bridge: WaBridge
  llm: LlmClient
  log: Logger
}

export function startDigestCron(deps: DigestCronDeps): ScheduledTask {
  const { schedule, bridge, llm, log } = deps
  const task = cron.schedule(schedule, () => {
    if (!bridge.isConnected()) {
      log.warn("digest cron skipped: WA not connected")
      return
    }
    const s = getSettings()
    runDigest({ groupJid: s.testGroupJid, reportToJid: s.reportToJid, llm, bridge, log })
      .then((result) => log.info({ summaryId: result.summaryId }, "digest cron completed"))
      .catch((err) => log.error({ err }, "digest cron failed"))
  })
  log.info({ schedule }, "digest cron scheduled")
  return task
}

import cron, { type ScheduledTask } from "node-cron"
import { runSentimentJob } from "./sentimentJob.js"
import { getSettings } from "./settings.js"
import type { LlmClient } from "./llm.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type SentimentCronDeps = {
  schedule: string
  bridge: WaBridge
  llm: LlmClient
  log: Logger
}

export function startSentimentCron(deps: SentimentCronDeps): ScheduledTask {
  const { schedule, bridge, llm, log } = deps
  const task = cron.schedule(schedule, () => {
    if (!bridge.isConnected()) {
      log.warn("sentiment cron skipped: WA not connected")
      return
    }
    const s = getSettings()
    runSentimentJob({ reportToJid: s.reportToJid, llm, bridge, log })
      .then((result) => {
        if (result) log.info({ sentimentId: result.sentimentId }, "sentiment cron completed")
      })
      .catch((err) => log.error({ err }, "sentiment cron failed"))
  })
  log.info({ schedule }, "sentiment cron scheduled")
  return task
}

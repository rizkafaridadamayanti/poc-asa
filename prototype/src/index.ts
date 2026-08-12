import { loadConfig } from "./config.js"
import { createLogger } from "./logger.js"
import { connectDb, disconnectDb } from "./db.js"
import { createBaileysBridge } from "./bridge.js"
import { createInboundHandler } from "./handlers.js"
import { createLlmClient } from "./llm.js"
import { startHttp } from "./http.js"
import { initSettings } from "./settings.js"
import { startAgendaScheduler } from "./scheduler.js"
import { startPurgeJob } from "./purge.js"
import { startDigestCron } from "./digestCron.js"
import { startSentimentCron } from "./sentimentCron.js"

async function main() {
  const cfg = loadConfig()
  initSettings({ reportToJid: cfg.reportToJid, testGroupJid: cfg.testGroupJid })
  const log = createLogger(cfg.logLevel)

  await connectDb(cfg.mongodbUri, cfg.dbName, log)
  startPurgeJob(log, cfg.mediaDir)

  const bridge = createBaileysBridge({
    authDir: cfg.authDir,
    mediaDir: cfg.mediaDir,
    log,
    sendMinDelayMs: cfg.sendMinDelayMs,
    sendMaxDelayMs: cfg.sendMaxDelayMs,
  })

  const llm = createLlmClient(cfg)

  const onInbound = createInboundHandler(log, bridge, llm)
  bridge.onMessage((msg) => {
    void onInbound(msg)
  })

  await bridge.start()
  startDigestCron({ schedule: cfg.digestCron, bridge, llm, log })
  startSentimentCron({ schedule: cfg.digestCron, bridge, llm, log })
  const app = await startHttp({ cfg, bridge, llm, log })
  const scheduler = startAgendaScheduler(bridge, log)

  const shutdown = async (signal: string) => {
    log.info({ signal }, "shutting down")
    scheduler.stop()
    try {
      await app.close()
    } catch {
      /* ignore */
    }
    await bridge.stop()
    await disconnectDb()
    process.exit(0)
  }

  process.on("SIGINT", () => void shutdown("SIGINT"))
  process.on("SIGTERM", () => void shutdown("SIGTERM"))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

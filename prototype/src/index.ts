import { loadConfig } from "./config.js"
import { createLogger } from "./logger.js"
import { connectDb, disconnectDb } from "./db.js"
import { GroupModel } from "./models/group.js"
import { createBaileysBridge } from "./bridge.js"
import { createInboundHandler } from "./handlers.js"
import { createLlmClient } from "./llm.js"
import { startHttp } from "./http.js"
import { initSettings } from "./settings.js"
import { startCuratedInfoScheduler } from "./curatedInfoScheduler.js"
import { startAgendaScheduler } from "./agendaScheduler.js"
import { startPurgeJob } from "./purge.js"
import { startDigestCron } from "./digestCron.js"
import { startSentimentCron } from "./sentimentCron.js"
import { startWeeklyStatsCron } from "./weeklyStatsCron.js"
import { startGroupSyncCron } from "./groupSync.js"

async function main() {
  const cfg = loadConfig()
  initSettings({ reportToJid: cfg.reportToJid, testGroupJid: cfg.testGroupJid })
  const log = createLogger(cfg.logLevel)

  await connectDb(cfg.mongodbUri, cfg.dbName, log)

  // dusunId only labels dusun/anggota groups. Strip any left on pusat groups so
  // they can't skew the "groups per dusun" stats. Idempotent, cheap after first run.
  const clearedDusun = await GroupModel.updateMany(
    { scope: "pusat", dusunId: { $nin: [null, ""] } },
    { $set: { dusunId: null } },
  )
  if (clearedDusun.modifiedCount > 0) {
    log.info({ count: clearedDusun.modifiedCount }, "cleared stale dusunId from pusat groups")
  }

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
  startWeeklyStatsCron({ schedule: cfg.weeklyStatsCron, bridge, log })
  startGroupSyncCron(bridge, log)
  const app = await startHttp({ cfg, bridge, llm, log })
  const curatedInfoScheduler = startCuratedInfoScheduler(bridge, log)
  const agendaScheduler = startAgendaScheduler(bridge, log)

  const shutdown = async (signal: string) => {
    log.info({ signal }, "shutting down")
    curatedInfoScheduler.stop()
    agendaScheduler.stop()
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

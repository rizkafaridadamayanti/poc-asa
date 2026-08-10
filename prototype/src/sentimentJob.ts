import { MessageModel } from "./models/message.js"
import { GroupModel } from "./models/group.js"
import { SentimentModel } from "./models/sentiment.js"
import type { LlmClient } from "./llm.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

const SENTIMENT_SYSTEM_PROMPT =
  "You are a sentiment analyst for Karang Taruna pengurus. Read the chat log and summarize overall sentiment (positive/negative/mixed) in concise Indonesian, with 2-3 supporting points. Do not quote chat content verbatim."

function yesterdayRange(now = new Date()): { start: Date; end: Date } {
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 1)
  return { start, end }
}

export async function runSentimentJob(opts: {
  reportToJid: string
  llm: LlmClient
  bridge: WaBridge
  log: Logger
}): Promise<{ sentimentId: string; messageCount: number } | null> {
  const { reportToJid, llm, bridge, log } = opts
  const { start, end } = yesterdayRange()

  const pusatGroups = await GroupModel.find({ scope: "pusat" }).select("waJid").lean()
  const pusatJids = pusatGroups.map((g) => g.waJid)
  if (pusatJids.length === 0) {
    log.warn("sentiment job skipped: no pusat-scoped groups registered yet")
    return null
  }

  const startTs = Math.floor(start.getTime() / 1000)
  const endTs = Math.floor(end.getTime() / 1000)
  const msgs = await MessageModel.find({
    chatJid: { $in: pusatJids },
    timestamp: { $gte: startTs, $lt: endTs },
    type: "text",
  })
    .sort({ timestamp: 1 })
    .lean()

  if (msgs.length === 0) {
    log.info("sentiment job: no pusat messages yesterday")
    return null
  }

  const body = msgs.map((m) => `[${m.fromJid}] ${m.text}`).join("\n")
  const bodyMd = await llm.complete(
    `Analisis sentimen chat Pengurus Pusat kemarin (${msgs.length} pesan):\n\n${body}`,
    SENTIMENT_SYSTEM_PROMPT,
  )

  const doc = await SentimentModel.create({
    periodStart: start,
    periodEnd: end,
    bodyMd,
    messageCount: msgs.length,
  })

  try {
    await bridge.sendText(
      reportToJid,
      `*Sentiment Harian Pusat*\n${start.toISOString().slice(0, 10)}\n\n${bodyMd}`,
    )
  } catch (err) {
    log.error({ err }, "sentiment WA push failed (saved anyway)")
  }

  return { sentimentId: String(doc._id), messageCount: msgs.length }
}

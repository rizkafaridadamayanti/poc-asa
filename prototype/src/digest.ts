import { MessageModel } from "./models/message.js"
import { SummaryModel } from "./models/summary.js"
import { getGroupScope } from "./acl.js"
import type { LlmClient } from "./llm.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type DigestResult = {
  summaryId: string
  bodyMd: string
  messageCount: number
  periodStart: Date
  periodEnd: Date
  waMessageId?: string
}

function yesterdayRange(now = new Date()): { start: Date; end: Date } {
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 1)
  return { start, end }
}

function buildPrompt(
  lines: Array<{ fromJid: string; text: string; timestamp: number }>,
  periodStart: Date,
  periodEnd: Date,
): string {
  const body = lines
    .map((m) => {
      const t = new Date(m.timestamp * 1000).toISOString()
      return `[${t}] ${m.fromJid}: ${m.text}`
    })
    .join("\n")

  return `Buat ringkasan harian chat Karang Taruna.

Periode: ${periodStart.toISOString()} s/d ${periodEnd.toISOString()} (kemarin, waktu server).
Jumlah pesan: ${lines.length}

Tugas:
1. Ringkas poin keputusan, usulan, dan action item.
2. Ranking singkat isu by impact / feasibility / urgency (1–5).
3. Hint meeting-bias: siapa yang dominan bicara (signal, bukan vonis).
4. Format markdown singkat, max ~400 kata, bahasa Indonesia.

Chat:
${body || "(tidak ada pesan teks)"}`
}

export async function runDigest(opts: {
  groupJid: string
  reportToJid: string
  llm: LlmClient
  bridge: WaBridge
  log: Logger
  /** If true, use last 24h instead of calendar yesterday (useful for POC demos). */
  last24h?: boolean
}): Promise<DigestResult> {
  const { groupJid, reportToJid, llm, bridge, log, last24h } = opts

  let periodStart: Date
  let periodEnd: Date
  if (last24h) {
    periodEnd = new Date()
    periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000)
  } else {
    ;({ start: periodStart, end: periodEnd } = yesterdayRange())
  }

  const startTs = Math.floor(periodStart.getTime() / 1000)
  const endTs = Math.floor(periodEnd.getTime() / 1000)

  const msgs = await MessageModel.find({
    chatJid: groupJid,
    timestamp: { $gte: startTs, $lt: endTs },
    type: "text",
  })
    .sort({ timestamp: 1 })
    .lean()

  log.info(
    { groupJid, count: msgs.length, periodStart, periodEnd },
    "digest load messages",
  )

  const lines = msgs.map((m) => ({
    fromJid: m.fromJid,
    text: m.text || "",
    timestamp: m.timestamp,
  }))

  let bodyMd: string
  try {
    bodyMd = await llm.complete(buildPrompt(lines, periodStart, periodEnd))
  } catch (err) {
    log.error({ err }, "digest LLM failed")
    throw err
  }

  const sourceScope = await getGroupScope(groupJid)
  const sourceMessageIds = msgs.map((m) => m.messageId)
  const doc = await SummaryModel.create({
    periodStart,
    periodEnd,
    sourceGroupJid: groupJid,
    sourceScope,
    bodyMd,
    priorityScore: 0,
    sourceMessageIds,
  })

  let waMessageId: string | undefined
  const pushText = `*ASA Digest*\nGroup: ${groupJid}\nPeriode: ${periodStart.toISOString().slice(0, 10)}\nMsgs: ${msgs.length}\n\n${bodyMd}`

  try {
    const sent = await bridge.sendText(reportToJid, pushText)
    waMessageId = sent.id
    log.info({ waMessageId, reportToJid }, "digest pushed to WA")
  } catch (err) {
    log.error({ err }, "digest WA push failed (summary already saved)")
  }

  return {
    summaryId: String(doc._id),
    bodyMd,
    messageCount: msgs.length,
    periodStart,
    periodEnd,
    waMessageId,
  }
}

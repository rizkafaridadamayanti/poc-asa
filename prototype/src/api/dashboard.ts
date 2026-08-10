import { MessageModel } from "../models/message.js"
import { SummaryModel } from "../models/summary.js"
import { ParticipantModel } from "../models/participant.js"
import { runDigest } from "../digest.js"
import { sendOutbound } from "../sender.js"
import { getSettings, updateSettings } from "../settings.js"
import type { LlmClient } from "../llm.js"
import type { WaBridge } from "../types.js"
import type { Logger } from "../logger.js"
import type { FastifyInstance } from "fastify"

export type DashboardDeps = {
  bridge: WaBridge
  llm: LlmClient
  log: Logger
}

function parsePagination(query: { limit?: string; offset?: string }) {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  const offset = Math.max(Number(query.offset) || 0, 0)
  return { limit, offset }
}

export async function registerDashboardApi(app: FastifyInstance, deps: DashboardDeps) {
  const { bridge, llm, log } = deps

  app.get("/api/dashboard/status", async () => {
    const [messageCount, summaryCount, participantCount] = await Promise.all([
      MessageModel.countDocuments(),
      SummaryModel.countDocuments(),
      ParticipantModel.countDocuments(),
    ])
    return {
      connected: bridge.isConnected(),
      messageCount,
      summaryCount,
      participantCount,
    }
  })

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/api/messages",
    async (req) => {
      const { limit, offset } = parsePagination(req.query)
      const rows = await MessageModel.find()
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
      const total = await MessageModel.countDocuments()
      return { total, offset, limit, count: rows.length, messages: rows }
    },
  )

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/api/summaries",
    async (req) => {
      const { limit, offset } = parsePagination(req.query)
      const rows = await SummaryModel.find()
        .sort({ periodStart: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
      const total = await SummaryModel.countDocuments()
      return { total, offset, limit, count: rows.length, summaries: rows }
    },
  )

  app.get("/api/participants", async () => {
    const rows = await ParticipantModel.find().sort({ updatedAt: -1 }).lean()
    return { count: rows.length, participants: rows }
  })

  app.post<{ Body: { to?: string; text?: string } }>("/api/send", async (req, reply) => {
    const to = req.body?.to
    const text = req.body?.text
    if (!to || !text) {
      return reply.code(400).send({ error: "body requires { to, text }" })
    }
    if (!bridge.isConnected()) {
      return reply.code(503).send({ error: "WA not connected" })
    }
    try {
      const result = await sendOutbound(bridge, to, text)
      return { ok: true, ...result }
    } catch (err) {
      log.error({ err }, "POST /api/send failed")
      return reply.code(500).send({
        error: err instanceof Error ? err.message : "send failed",
      })
    }
  })

  app.post<{
    Body?: { last24h?: boolean }
  }>("/api/digest/run", async (req, reply) => {
    if (!bridge.isConnected()) {
      return reply.code(503).send({ error: "WA not connected" })
    }
    try {
      const s = getSettings()
      const result = await runDigest({
        groupJid: s.testGroupJid,
        reportToJid: s.reportToJid,
        llm,
        bridge,
        log,
        last24h: req.body?.last24h === true,
      })
      return { ok: true, ...result }
    } catch (err) {
      log.error({ err }, "POST /api/digest/run failed")
      return reply.code(500).send({
        error: err instanceof Error ? err.message : "digest failed",
      })
    }
  })

  app.get("/api/settings", async () => {
    return getSettings()
  })

  app.patch<{
    Body?: { reportToJid?: string; testGroupJid?: string }
  }>("/api/settings", async (req, reply) => {
    const patch = req.body
    if (!patch || (patch.reportToJid === undefined && patch.testGroupJid === undefined)) {
      return reply.code(400).send({ error: "body requires at least one of { reportToJid, testGroupJid }" })
    }
    const next = updateSettings(patch)
    log.info({ next }, "settings updated via API")
    return next
  })
}

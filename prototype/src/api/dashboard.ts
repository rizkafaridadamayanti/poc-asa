import { MessageModel } from "../models/message.js"
import { SummaryModel, type SummaryDoc } from "../models/summary.js"
import { ParticipantModel } from "../models/participant.js"
import { GroupModel, GROUP_SCOPES, type GroupScope } from "../models/group.js"
import { toJid } from "../jid.js"
import { runDigest } from "../digest.js"
import { buildSummaryDocx } from "../docExport.js"
import { getContributiveStats, getPeakHours, getGroupsByDusun } from "../stats.js"
import { SentimentModel } from "../models/sentiment.js"
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
      device: bridge.getDeviceInfo(),
      messageCount,
      summaryCount,
      participantCount,
    }
  })

  app.get<{ Querystring: { limit?: string; offset?: string; chatJid?: string; q?: string } }>(
    "/api/messages",
    async (req) => {
      const { limit, offset } = parsePagination(req.query)
      const filter: Record<string, unknown> = {}
      if (req.query.chatJid) filter.chatJid = req.query.chatJid
      if (req.query.q) {
        const re = { $regex: req.query.q, $options: "i" }
        filter.$or = [{ text: re }, { fromJid: re }]
      }

      const rows = await MessageModel.aggregate([
        { $match: filter },
        { $sort: { timestamp: -1 } },
        { $skip: offset },
        { $limit: limit },
        {
          $lookup: {
            from: "groups",
            localField: "chatJid",
            foreignField: "waJid",
            as: "groupInfo",
          },
        },
        { $addFields: { chatName: { $arrayElemAt: ["$groupInfo.name", 0] } } },
        { $project: { groupInfo: 0 } },
      ])

      const total = await MessageModel.countDocuments(filter)
      return { total, offset, limit, count: rows.length, messages: rows }
    },
  )

  app.get<{
    Querystring: {
      limit?: string
      offset?: string
      groupJid?: string
      from?: string
      to?: string
      keyword?: string
    }
  }>("/api/summaries", async (req) => {
    const { limit, offset } = parsePagination(req.query)
    const { groupJid, from, to, keyword } = req.query

    const filter: Record<string, unknown> = {}
    if (groupJid) filter.sourceGroupJid = groupJid
    if (from || to) {
      const periodStart: Record<string, Date> = {}
      if (from) periodStart.$gte = new Date(from)
      if (to) periodStart.$lte = new Date(to)
      filter.periodStart = periodStart
    }
    if (keyword) filter.bodyMd = { $regex: keyword, $options: "i" }

    const rows = await SummaryModel.find(filter)
      .sort({ periodStart: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
    const total = await SummaryModel.countDocuments(filter)
    return { total, offset, limit, count: rows.length, summaries: rows }
  })

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

  app.get("/api/groups", async () => {
    const rows = await GroupModel.find().sort({ name: 1 }).lean()
    return { count: rows.length, groups: rows }
  })

  app.post<{
    Body: { waJid?: string; name?: string; scope?: string; dusunId?: string }
  }>("/api/groups", async (req, reply) => {
    const { waJid, name, scope, dusunId } = req.body || {}
    if (!waJid || !scope) {
      return reply.code(400).send({ error: "body requires { waJid, scope }" })
    }
    if (!GROUP_SCOPES.includes(scope as GroupScope)) {
      return reply.code(400).send({ error: `scope must be one of ${GROUP_SCOPES.join(", ")}` })
    }
    let normalizedJid: string
    try {
      normalizedJid = toJid(waJid)
    } catch {
      return reply.code(400).send({ error: "waJid is not a valid group JID or phone number" })
    }
    try {
      const doc = await GroupModel.create({
        waJid: normalizedJid,
        name: name || "",
        scope,
        dusunId: dusunId || "",
      })
      return reply.code(201).send({ ok: true, group: doc })
    } catch {
      return reply.code(409).send({ error: "group with this waJid already exists" })
    }
  })

  app.patch<{
    Params: { id: string }
    Body?: { name?: string; scope?: string; dusunId?: string }
  }>("/api/groups/:id", async (req, reply) => {
    const patch = req.body
    if (!patch || (patch.name === undefined && patch.scope === undefined && patch.dusunId === undefined)) {
      return reply.code(400).send({ error: "body requires at least one of { name, scope, dusunId }" })
    }
    if (patch.scope !== undefined && !GROUP_SCOPES.includes(patch.scope as GroupScope)) {
      return reply.code(400).send({ error: `scope must be one of ${GROUP_SCOPES.join(", ")}` })
    }
    const doc = await GroupModel.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean()
    if (!doc) return reply.code(404).send({ error: "group not found" })
    return { ok: true, group: doc }
  })

  app.delete<{ Params: { id: string } }>("/api/groups/:id", async (req, reply) => {
    const doc = await GroupModel.findByIdAndDelete(req.params.id).lean()
    if (!doc) return reply.code(404).send({ error: "group not found" })
    return { ok: true }
  })

  // Backfill: registers every group the bot is already in (e.g. groups joined before
  // auto-registration existed, or that have gone quiet since). Scope is left unset
  // for anything not already known, same as the on-message auto-register path.
  app.post("/api/groups/sync", async (_req, reply) => {
    if (!bridge.isConnected()) {
      return reply.code(503).send({ error: "WA not connected" })
    }
    try {
      const participating = await bridge.listParticipatingGroups()
      let created = 0
      for (const g of participating) {
        const res = await GroupModel.findOneAndUpdate(
          { waJid: g.id },
          { $setOnInsert: { waJid: g.id, name: g.subject, scope: null, dusunId: null, source: "auto" } },
          { upsert: true, setDefaultsOnInsert: true, rawResult: true },
        )
        if (!res.lastErrorObject?.updatedExisting) created++
      }
      log.info({ scanned: participating.length, created }, "groups synced from WhatsApp")
      return { ok: true, scanned: participating.length, created }
    } catch (err) {
      log.error({ err }, "POST /api/groups/sync failed")
      return reply.code(500).send({ error: err instanceof Error ? err.message : "sync failed" })
    }
  })

  app.patch<{
    Params: { id: string }
    Body?: { read?: boolean; important?: boolean; trash?: boolean }
  }>("/api/summaries/:id", async (req, reply) => {
    const patch = req.body
    if (!patch || (patch.read === undefined && patch.important === undefined && patch.trash === undefined)) {
      return reply.code(400).send({ error: "body requires at least one of { read, important, trash }" })
    }
    const update: Record<string, unknown> = {}
    if (patch.read !== undefined) update.read = patch.read
    if (patch.important !== undefined) update.important = patch.important
    if (patch.trash !== undefined) {
      update.trash = patch.trash
      update.trashedAt = patch.trash ? new Date() : null
    }
    const doc = await SummaryModel.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean()
    if (!doc) return reply.code(404).send({ error: "summary not found" })
    return { ok: true, summary: doc }
  })

  app.get<{ Params: { id: string } }>("/api/summaries/:id/export", async (req, reply) => {
    const doc = await SummaryModel.findById(req.params.id).lean<SummaryDoc | null>()
    if (!doc) return reply.code(404).send({ error: "summary not found" })
    const buffer = await buildSummaryDocx(doc)
    reply
      .header(
        "content-type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      .header("content-disposition", `attachment; filename="summary-${req.params.id}.docx"`)
    return reply.send(buffer)
  })

  app.get("/api/stats/contributive", async () => ({ rows: await getContributiveStats() }))

  app.get("/api/stats/peak-hours", async () => ({ rows: await getPeakHours() }))

  app.get("/api/stats/dusun", async () => ({ rows: await getGroupsByDusun() }))

  app.get("/api/sentiments", async () => {
    const rows = await SentimentModel.find().sort({ periodStart: -1 }).limit(10).lean()
    return { count: rows.length, sentiments: rows }
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

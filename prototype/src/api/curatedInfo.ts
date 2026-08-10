import {
  CuratedInfoModel,
  CURATED_INFO_TYPES,
  CURATED_INFO_STATUSES,
  type CuratedInfoStatus,
  type CuratedInfoType,
} from "../models/curated_info.js"
import { isGroupJid } from "../jid.js"
import { fanOutCuratedInfo } from "../curation.js"
import type { WaBridge } from "../types.js"
import type { Logger } from "../logger.js"
import type { FastifyInstance } from "fastify"

export type CuratedInfoDeps = {
  bridge: WaBridge
  log: Logger
}

function isValidType(v: unknown): v is CuratedInfoType {
  return typeof v === "string" && (CURATED_INFO_TYPES as readonly string[]).includes(v)
}

function invalidTargets(targets: string[]): string[] {
  return targets.filter((t) => !isGroupJid(t))
}

export async function registerCuratedInfoApi(app: FastifyInstance, deps: CuratedInfoDeps) {
  const { bridge, log } = deps

  app.get<{ Querystring: { status?: string } }>("/api/curated-infos", async (req, reply) => {
    const { status } = req.query
    if (status && !(CURATED_INFO_STATUSES as readonly string[]).includes(status)) {
      return reply
        .code(400)
        .send({ error: `status must be one of ${CURATED_INFO_STATUSES.join(", ")}` })
    }
    const rows = await CuratedInfoModel.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .lean()
    return { count: rows.length, curatedInfos: rows }
  })

  app.get<{ Params: { id: string } }>("/api/curated-infos/:id", async (req, reply) => {
    const doc = await CuratedInfoModel.findById(req.params.id).lean()
    if (!doc) return reply.code(404).send({ error: "not found" })
    return doc
  })

  app.post<{
    Body?: { type?: string; title?: string; body?: string; targets?: string[] }
  }>("/api/curated-infos", async (req, reply) => {
    const { type, title, body, targets } = req.body || {}
    if (!isValidType(type)) {
      return reply.code(400).send({ error: `type must be one of ${CURATED_INFO_TYPES.join(", ")}` })
    }
    if (!title?.trim() || !body?.trim()) {
      return reply.code(400).send({ error: "title and body are required" })
    }
    const targetList = Array.isArray(targets) ? targets : []
    const bad = invalidTargets(targetList)
    if (bad.length > 0) {
      return reply.code(400).send({ error: `targets must be group JIDs (@g.us): ${bad.join(", ")}` })
    }
    const doc = await CuratedInfoModel.create({
      type,
      title: title.trim(),
      body: body.trim(),
      targets: targetList,
    })
    log.info({ id: String(doc._id), type }, "curated info draft created")
    return reply.code(201).send(doc)
  })

  app.patch<{
    Params: { id: string }
    Body?: { type?: string; title?: string; body?: string; targets?: string[] }
  }>("/api/curated-infos/:id", async (req, reply) => {
    const { type, title, body, targets } = req.body || {}
    if (type !== undefined && !isValidType(type)) {
      return reply.code(400).send({ error: `type must be one of ${CURATED_INFO_TYPES.join(", ")}` })
    }
    if (targets !== undefined) {
      const bad = invalidTargets(targets)
      if (bad.length > 0) {
        return reply
          .code(400)
          .send({ error: `targets must be group JIDs (@g.us): ${bad.join(", ")}` })
      }
    }
    const set: Record<string, unknown> = {}
    if (type !== undefined) set.type = type
    if (title !== undefined) set.title = title.trim()
    if (body !== undefined) set.body = body.trim()
    if (targets !== undefined) set.targets = targets

    const updated = await CuratedInfoModel.findOneAndUpdate(
      { _id: req.params.id, status: "draft" },
      { $set: set },
      { new: true },
    ).lean()
    if (!updated) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? 'cannot edit: item is not a "draft"' : "not found" })
    }
    return updated
  })

  app.delete<{ Params: { id: string } }>("/api/curated-infos/:id", async (req, reply) => {
    const deleted = await CuratedInfoModel.findOneAndDelete({
      _id: req.params.id,
      status: "draft",
    }).lean()
    if (!deleted) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? 'cannot delete: item is not a "draft"' : "not found" })
    }
    return { ok: true }
  })

  app.post<{ Params: { id: string } }>("/api/curated-infos/:id/approve", async (req, reply) => {
    const doc = await CuratedInfoModel.findOne({ _id: req.params.id, status: "draft" })
    if (!doc) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? 'cannot approve: item is not a "draft"' : "not found" })
    }
    if (doc.targets.length === 0) {
      return reply.code(400).send({ error: "add at least one target group before approving" })
    }
    doc.status = "approved"
    doc.approvedAt = new Date()
    await doc.save()
    log.info({ id: String(doc._id) }, "curated info approved")
    return doc
  })

  app.post<{ Params: { id: string } }>("/api/curated-infos/:id/fan-out", async (req, reply) => {
    try {
      const result = await fanOutCuratedInfo(req.params.id, bridge, log)
      return { ok: true, ...result }
    } catch (err) {
      const message = err instanceof Error ? err.message : "fan-out failed"
      const clientError = message.startsWith("cannot fan out") || message === "WA not connected"
      return reply.code(clientError ? 409 : 500).send({ error: message })
    }
  })
}

export type { CuratedInfoStatus }

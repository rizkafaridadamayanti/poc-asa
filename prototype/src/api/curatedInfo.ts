import mongoose from "mongoose"
import {
  CuratedInfoModel,
  CURATED_INFO_TYPES,
  CURATED_INFO_STATUSES,
  type CuratedInfoStatus,
  type CuratedInfoType,
} from "../models/curated_info.js"
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

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

/** Targets can be group JIDs (@g.us) or individual number JIDs (@s.whatsapp.net / @lid) — just require a JID shape. */
function invalidTargets(targets: string[]): string[] {
  return targets.filter((t) => !t.includes("@"))
}

export async function registerCuratedInfoApi(app: FastifyInstance, deps: CuratedInfoDeps) {
  const { bridge, log } = deps

  app.get<{ Querystring: { status?: string; trash?: string } }>(
    "/api/curated-infos",
    async (req, reply) => {
      const { status } = req.query
      if (status && !(CURATED_INFO_STATUSES as readonly string[]).includes(status)) {
        return reply
          .code(400)
          .send({ error: `status must be one of ${CURATED_INFO_STATUSES.join(", ")}` })
      }
      // Pre-existing items predate the trash field and have it unset, so
      // "active" means "not explicitly trashed" rather than "trash === false".
      const filter: Record<string, unknown> = { trash: req.query.trash === "true" ? true : { $ne: true } }
      if (status) filter.status = status
      const rows = await CuratedInfoModel.find(filter).sort({ createdAt: -1 }).lean()
      return { count: rows.length, curatedInfos: rows }
    },
  )

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
      return reply.code(400).send({ error: `targets must be valid JIDs: ${bad.join(", ")}` })
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
        return reply.code(400).send({ error: `targets must be valid JIDs: ${bad.join(", ")}` })
      }
    }
    const set: Record<string, unknown> = {}
    if (type !== undefined) set.type = type
    if (title !== undefined) set.title = title.trim()
    if (body !== undefined) set.body = body.trim()
    if (targets !== undefined) set.targets = targets

    const updated = await CuratedInfoModel.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: "sent" } },
      { $set: set },
      { new: true },
    ).lean()
    if (!updated) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? "cannot edit: item was already sent" : "not found" })
    }
    return updated
  })

  // Soft delete: hide from the active list, keep in Riwayat until restored or permanently deleted.
  app.delete<{ Params: { id: string } }>("/api/curated-infos/:id", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const res = await CuratedInfoModel.updateOne(
      { _id: req.params.id },
      { $set: { trash: true, trashedAt: new Date() } },
    )
    if (res.matchedCount === 0) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })

  app.post<{ Params: { id: string } }>("/api/curated-infos/:id/restore", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const res = await CuratedInfoModel.updateOne(
      { _id: req.params.id },
      { $set: { trash: false, trashedAt: null } },
    )
    if (res.matchedCount === 0) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>("/api/curated-infos/:id/permanent", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const deleted = await CuratedInfoModel.findByIdAndDelete(req.params.id).lean()
    if (!deleted) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })

  app.post<{
    Params: { id: string }
    Body?: { scheduledAt?: string }
  }>("/api/curated-infos/:id/schedule", async (req, reply) => {
    const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return reply.code(400).send({ error: "body requires a valid { scheduledAt }" })
    }
    const doc = await CuratedInfoModel.findOne({ _id: req.params.id, status: "draft" })
    if (!doc) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? 'cannot schedule: item is not a "draft"' : "not found" })
    }
    if (doc.targets.length === 0) {
      return reply.code(400).send({ error: "add at least one target before scheduling" })
    }
    doc.status = "scheduled"
    doc.scheduledAt = scheduledAt
    await doc.save()
    log.info({ id: String(doc._id), scheduledAt }, "curated info scheduled")
    return doc
  })

  app.post<{ Params: { id: string } }>("/api/curated-infos/:id/unschedule", async (req, reply) => {
    const doc = await CuratedInfoModel.findOneAndUpdate(
      { _id: req.params.id, status: "scheduled" },
      { $set: { status: "draft", scheduledAt: null } },
      { new: true },
    ).lean()
    if (!doc) {
      const exists = await CuratedInfoModel.exists({ _id: req.params.id })
      return reply
        .code(exists ? 409 : 404)
        .send({ error: exists ? 'cannot unschedule: item is not "scheduled"' : "not found" })
    }
    return doc
  })

  app.post<{ Params: { id: string } }>("/api/curated-infos/:id/send", async (req, reply) => {
    try {
      const result = await fanOutCuratedInfo(req.params.id, bridge, log)
      return { ok: true, ...result }
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed"
      const clientError = message.startsWith("cannot send") || message.startsWith("add at least") || message === "WA not connected"
      return reply.code(clientError ? 409 : 500).send({ error: message })
    }
  })
}

export type { CuratedInfoStatus }

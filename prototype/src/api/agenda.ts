import mongoose from "mongoose"
import { AgendaModel } from "../models/agenda.js"
import { toJid } from "../jid.js"
import type { Logger } from "../logger.js"
import type { FastifyInstance } from "fastify"

export type AgendaDeps = {
  log: Logger
}

type ReminderInput = { at?: string; label?: string }

type AgendaBody = {
  title?: string
  description?: string
  dueAt?: string
  remindAt?: ReminderInput[]
  audience?: string[]
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

function parseDate(input: unknown): Date | null {
  if (typeof input !== "string" && typeof input !== "number") return null
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeAudience(list: string[]): { ok: string[]; bad: string[] } {
  const ok: string[] = []
  const bad: string[] = []
  for (const raw of list) {
    try {
      ok.push(toJid(raw))
    } catch {
      bad.push(raw)
    }
  }
  return { ok, bad }
}

function parseReminders(list: ReminderInput[]): { at: Date; label: string; sent: false; sentAt: null }[] | null {
  const parsed: { at: Date; label: string; sent: false; sentAt: null }[] = []
  for (const r of list) {
    const at = parseDate(r.at)
    if (!at) return null
    parsed.push({ at, label: r.label?.trim() || "", sent: false, sentAt: null })
  }
  return parsed
}

export async function registerAgendaApi(app: FastifyInstance, deps: AgendaDeps) {
  const { log } = deps

  app.get<{ Querystring: { upcoming?: string; trash?: string } }>("/api/agendas", async (req) => {
    const filter: Record<string, unknown> = { trash: req.query.trash === "true" ? true : { $ne: true } }
    if (req.query.upcoming === "true") filter.dueAt = { $gte: new Date() }
    const rows = await AgendaModel.find(filter).sort({ dueAt: 1 }).lean()
    return { count: rows.length, agendas: rows }
  })

  app.post<{ Body?: AgendaBody }>("/api/agendas", async (req, reply) => {
    const { title, description, dueAt, remindAt, audience } = req.body || {}
    if (!title?.trim()) {
      return reply.code(400).send({ error: "title is required" })
    }

    const due = parseDate(dueAt)
    if (!due) {
      return reply.code(400).send({ error: "dueAt must be a valid date" })
    }

    const reminders = parseReminders(Array.isArray(remindAt) ? remindAt : [])
    if (reminders === null) {
      return reply.code(400).send({ error: "remindAt must be an array of { at, label } with valid dates" })
    }

    const audienceList = Array.isArray(audience) ? audience : []
    if (audienceList.length === 0) {
      return reply.code(400).send({ error: "audience must have at least one recipient" })
    }
    const { ok, bad } = normalizeAudience(audienceList)
    if (bad.length > 0) {
      return reply.code(400).send({ error: `invalid audience entries: ${bad.join(", ")}` })
    }

    const doc = await AgendaModel.create({
      title: title.trim(),
      description: description?.trim() || "",
      dueAt: due,
      remindAt: reminders,
      audience: ok,
    })
    log.info({ id: String(doc._id) }, "agenda created")
    return reply.code(201).send(doc)
  })

  app.patch<{ Params: { id: string }; Body?: AgendaBody }>("/api/agendas/:id", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const { title, description, dueAt, remindAt, audience } = req.body || {}
    const set: Record<string, unknown> = {}

    if (title !== undefined) {
      if (!title.trim()) return reply.code(400).send({ error: "title cannot be empty" })
      set.title = title.trim()
    }
    if (description !== undefined) set.description = description.trim()
    if (dueAt !== undefined) {
      const due = parseDate(dueAt)
      if (!due) return reply.code(400).send({ error: "dueAt must be a valid date" })
      set.dueAt = due
    }
    if (remindAt !== undefined) {
      const reminders = parseReminders(remindAt)
      if (reminders === null) {
        return reply.code(400).send({ error: "remindAt must be an array of { at, label } with valid dates" })
      }
      // Redefining reminders resets their sent state.
      set.remindAt = reminders
    }
    if (audience !== undefined) {
      if (audience.length === 0) {
        return reply.code(400).send({ error: "audience must have at least one recipient" })
      }
      const { ok, bad } = normalizeAudience(audience)
      if (bad.length > 0) {
        return reply.code(400).send({ error: `invalid audience entries: ${bad.join(", ")}` })
      }
      set.audience = ok
    }

    const updated = await AgendaModel.findByIdAndUpdate(req.params.id, { $set: set }, { new: true }).lean()
    if (!updated) return reply.code(404).send({ error: "not found" })
    return updated
  })

  // Soft delete: hide from the active list, keep in Riwayat until restored or permanently deleted.
  app.delete<{ Params: { id: string } }>("/api/agendas/:id", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const res = await AgendaModel.updateOne(
      { _id: req.params.id },
      { $set: { trash: true, trashedAt: new Date() } },
    )
    if (res.matchedCount === 0) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })

  app.post<{ Params: { id: string } }>("/api/agendas/:id/restore", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const res = await AgendaModel.updateOne(
      { _id: req.params.id },
      { $set: { trash: false, trashedAt: null } },
    )
    if (res.matchedCount === 0) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })

  app.delete<{ Params: { id: string } }>("/api/agendas/:id/permanent", async (req, reply) => {
    if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
    const deleted = await AgendaModel.findByIdAndDelete(req.params.id).lean()
    if (!deleted) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })
}

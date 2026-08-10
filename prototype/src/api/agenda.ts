import { AgendaModel } from "../models/agenda.js"
import { toJid } from "../jid.js"
import type { Logger } from "../logger.js"
import type { FastifyInstance } from "fastify"

export type AgendaDeps = {
  log: Logger
}

type AgendaBody = {
  title?: string
  description?: string
  dueAt?: string
  remindAt?: string[]
  audience?: string[]
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

export async function registerAgendaApi(app: FastifyInstance, deps: AgendaDeps) {
  const { log } = deps

  app.get<{ Querystring: { upcoming?: string } }>("/api/agendas", async (req) => {
    const query = req.query.upcoming === "true" ? { dueAt: { $gte: new Date() } } : {}
    const rows = await AgendaModel.find(query).sort({ dueAt: 1 }).lean()
    return { count: rows.length, agendas: rows }
  })

  app.get<{ Params: { id: string } }>("/api/agendas/:id", async (req, reply) => {
    const doc = await AgendaModel.findById(req.params.id).lean()
    if (!doc) return reply.code(404).send({ error: "not found" })
    return doc
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

    const remindList = Array.isArray(remindAt) ? remindAt : []
    const reminders = remindList.map(parseDate)
    if (reminders.some((d) => d === null)) {
      return reply.code(400).send({ error: "remindAt must be an array of valid dates" })
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
      remindAt: (reminders as Date[]).map((at) => ({ at, sent: false, sentAt: null })),
      audience: ok,
    })
    log.info({ id: String(doc._id) }, "agenda created")
    return reply.code(201).send(doc)
  })

  app.patch<{ Params: { id: string }; Body?: AgendaBody }>("/api/agendas/:id", async (req, reply) => {
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
      const reminders = remindAt.map(parseDate)
      if (reminders.some((d) => d === null)) {
        return reply.code(400).send({ error: "remindAt must be an array of valid dates" })
      }
      // Redefining reminders resets their sent state.
      set.remindAt = (reminders as Date[]).map((at) => ({ at, sent: false, sentAt: null }))
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

    const updated = await AgendaModel.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { new: true },
    ).lean()
    if (!updated) return reply.code(404).send({ error: "not found" })
    return updated
  })

  app.delete<{ Params: { id: string } }>("/api/agendas/:id", async (req, reply) => {
    const deleted = await AgendaModel.findByIdAndDelete(req.params.id).lean()
    if (!deleted) return reply.code(404).send({ error: "not found" })
    return { ok: true }
  })
}

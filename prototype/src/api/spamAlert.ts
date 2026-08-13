import mongoose from "mongoose"
import { SpamAlertModel } from "../models/spamAlert.js"
import type { FastifyInstance } from "fastify"

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

const STATUSES = ["open", "confirmed", "dismissed"] as const

export async function registerSpamAlertApi(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string } }>("/api/spam-alerts", async (req, reply) => {
    const { status } = req.query
    if (status && !(STATUSES as readonly string[]).includes(status)) {
      return reply.code(400).send({ error: `status must be one of ${STATUSES.join(", ")}` })
    }
    const rows = await SpamAlertModel.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    return { count: rows.length, alerts: rows }
  })

  app.post<{ Params: { id: string }; Body?: { status?: string } }>(
    "/api/spam-alerts/:id/status",
    async (req, reply) => {
      if (!isValidObjectId(req.params.id)) return reply.code(404).send({ error: "not found" })
      const { status } = req.body || {}
      if (!status || !(STATUSES as readonly string[]).includes(status)) {
        return reply.code(400).send({ error: `status must be one of ${STATUSES.join(", ")}` })
      }
      const doc = await SpamAlertModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).lean()
      if (!doc) return reply.code(404).send({ error: "not found" })
      return doc
    },
  )
}

import { AnonymousIdeaModel } from "../models/anonymousIdea.js"
import type { FastifyInstance } from "fastify"

export async function registerAnonymousIdeaApi(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string } }>("/api/anonymous-ideas", async (req, reply) => {
    const { status } = req.query
    if (status && status !== "new" && status !== "reviewed") {
      return reply.code(400).send({ error: 'status must be "new" or "reviewed"' })
    }
    const rows = await AnonymousIdeaModel.find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .lean()
    return { count: rows.length, ideas: rows }
  })

  app.post<{ Params: { id: string } }>("/api/anonymous-ideas/:id/review", async (req, reply) => {
    const doc = await AnonymousIdeaModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "reviewed" } },
      { new: true },
    ).lean()
    if (!doc) return reply.code(404).send({ error: "not found" })
    return doc
  })
}

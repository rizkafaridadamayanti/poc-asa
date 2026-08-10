import { OutboundLogModel } from "../models/outboundLog.js"
import type { FastifyInstance } from "fastify"

export async function registerOutboundLogApi(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string; toJid?: string } }>(
    "/api/outbound-logs",
    async (req) => {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
      const filter = req.query.toJid ? { toJid: req.query.toJid } : {}
      const rows = await OutboundLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
      return { count: rows.length, logs: rows }
    },
  )
}

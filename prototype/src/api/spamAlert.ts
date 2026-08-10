import { SpamAlertModel } from "../models/spamAlert.js"
import type { FastifyInstance } from "fastify"

export async function registerSpamAlertApi(app: FastifyInstance) {
  app.get("/api/spam-alerts", async () => {
    const rows = await SpamAlertModel.find().sort({ createdAt: -1 }).limit(100).lean()
    return { count: rows.length, alerts: rows }
  })
}

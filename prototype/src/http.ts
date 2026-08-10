import path from "path"
import { fileURLToPath } from "url"
import Fastify from "fastify"
import staticPlugin from "@fastify/static"
import { MessageModel } from "./models/message.js"
import { runDigest } from "./digest.js"
import { sendOutbound } from "./sender.js"
import { registerDashboardApi } from "./api/dashboard.js"
import { registerCuratedInfoApi } from "./api/curatedInfo.js"
import { registerAgendaApi } from "./api/agenda.js"
import { registerEventsApi } from "./api/events.js"
import { registerAuthRoutes, createAuthMiddleware } from "./auth.js"
import { getSettings } from "./settings.js"
import type { LlmClient } from "./llm.js"
import type { AppConfig, WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webDist = path.resolve(__dirname, "../web/dist")

export type HttpDeps = {
  cfg: AppConfig
  bridge: WaBridge
  llm: LlmClient
  log: Logger
}

export async function startHttp(deps: HttpDeps) {
  const { cfg, bridge, llm, log } = deps
  const app = Fastify({ logger: false })

  // Public routes
  app.get("/health", async () => ({
    ok: true,
    connected: bridge.isConnected(),
  }))

  registerEventsApi(app, bridge)
  registerAuthRoutes(app, { jwtSecret: cfg.jwtSecret, log })

  // Protected API routes
  await app.register(async (api) => {
    const requireAuth = createAuthMiddleware(cfg.jwtSecret)
    api.addHook("onRequest", requireAuth)

    api.get<{ Querystring: { limit?: string } }>("/messages", async (req) => {
      const limit = Math.min(Number(req.query.limit) || 20, 100)
      const rows = await MessageModel.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
      return { count: rows.length, messages: rows }
    })

    api.post<{ Body: { to?: string; text?: string } }>("/send", async (req, reply) => {
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
        log.error({ err }, "POST /send failed")
        return reply.code(500).send({
          error: err instanceof Error ? err.message : "send failed",
        })
      }
    })

    api.post<{
      Body?: { last24h?: boolean }
    }>("/digest/run", async (req, reply) => {
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
        log.error({ err }, "POST /digest/run failed")
        return reply.code(500).send({
          error: err instanceof Error ? err.message : "digest failed",
        })
      }
    })

    await registerDashboardApi(api, { bridge, llm, log })
    await registerCuratedInfoApi(api, { bridge, log })
    await registerAgendaApi(api, { log })
  })

  await app.register(staticPlugin, {
    root: webDist,
    prefix: "/",
    wildcard: false,
  })

  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not found" })
    }
    return reply.sendFile("index.html")
  })

  await app.listen({ port: cfg.port, host: "0.0.0.0" })
  log.info({ port: cfg.port }, "http listening")
  return app
}

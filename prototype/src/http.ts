import path from "path"
import { fileURLToPath } from "url"
import Fastify from "fastify"
import staticPlugin from "@fastify/static"
import { registerDashboardApi } from "./api/dashboard.js"
import { registerCuratedInfoApi } from "./api/curatedInfo.js"
import { registerOutboundLogApi } from "./api/outboundLog.js"
import { registerQaApi } from "./api/qa.js"
import { registerAgendaApi } from "./api/agenda.js"
import { registerSpamAlertApi } from "./api/spamAlert.js"
import { registerAnonymousIdeaApi } from "./api/anonymousIdea.js"
import { registerEventsApi } from "./api/events.js"
import { registerAuthRoutes, createAuthMiddleware } from "./auth.js"
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
  registerAuthRoutes(app, { jwtSecret: cfg.jwtSecret, log, inviteCode: cfg.dashboardPassword })

  // Protected API routes
  await app.register(async (api) => {
    const requireAuth = createAuthMiddleware(cfg.jwtSecret)
    api.addHook("onRequest", requireAuth)

    await registerDashboardApi(api, { bridge, llm, log, mediaDir: cfg.mediaDir })
    await registerCuratedInfoApi(api, { bridge, log })
    await registerOutboundLogApi(api)
    await registerQaApi(api, { llm, log })
    await registerAgendaApi(api, { log })
    await registerSpamAlertApi(api)
    await registerAnonymousIdeaApi(api)
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

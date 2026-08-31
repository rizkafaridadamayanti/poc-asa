import { answerQuestion } from "../qa.js"
import type { LlmClient } from "../llm.js"
import type { Logger } from "../logger.js"
import type { FastifyInstance } from "fastify"

export type QaApiDeps = {
  llm: LlmClient
  log: Logger
}

export async function registerQaApi(app: FastifyInstance, deps: QaApiDeps) {
  const { llm, log } = deps

  app.post<{ Body?: { question?: string; scopeGroupJid?: string } }>(
    "/api/qa/ask",
    async (req, reply) => {
      const question = req.body?.question
      if (!question?.trim()) {
        return reply.code(400).send({ error: "question is required" })
      }
      try {
        // Dashboard is pusat-only per the auth model — full ACL position.
        const result = await answerQuestion({
          question,
          llm,
          requester: { tier: "pusat" },
          onlyGroupJid: req.body?.scopeGroupJid,
        })
        return result
      } catch (err) {
        log.error({ err }, "POST /api/qa/ask failed")
        return reply.code(500).send({
          error: err instanceof Error ? err.message : "qa failed",
        })
      }
    },
  )
}

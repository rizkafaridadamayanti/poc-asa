import OpenAI from "openai"
import type { AppConfig } from "./types.js"

export type LlmClient = {
  complete(prompt: string, systemPrompt?: string): Promise<string>
}

const DEFAULT_SYSTEM_PROMPT =
  "You are an assistant for Karang Taruna pengurus. Write clear Indonesian summaries. Be concise and factual."

const MAX_ATTEMPTS = 3

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function createLlmClient(cfg: AppConfig): LlmClient {
  const client = new OpenAI({
    apiKey: cfg.deepseekApiKey,
    baseURL: cfg.llmBaseUrl,
  })

  return {
    async complete(prompt: string, systemPrompt?: string): Promise<string> {
      let lastErr: unknown
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await client.chat.completions.create({
            model: cfg.llmModel,
            messages: [
              { role: "system", content: systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          })
          const text = res.choices[0]?.message?.content?.trim()
          if (!text) throw new Error("empty LLM response")
          return text
        } catch (err) {
          lastErr = err
          if (attempt < MAX_ATTEMPTS) await sleep(attempt * 1000)
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("LLM request failed")
    },
  }
}

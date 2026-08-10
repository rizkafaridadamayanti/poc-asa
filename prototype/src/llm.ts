import OpenAI from "openai"
import type { AppConfig } from "./types.js"

export type LlmClient = {
  complete(prompt: string): Promise<string>
}

export function createLlmClient(cfg: AppConfig): LlmClient {
  const client = new OpenAI({
    apiKey: cfg.deepseekApiKey,
    baseURL: cfg.llmBaseUrl,
  })

  return {
    async complete(prompt: string): Promise<string> {
      const res = await client.chat.completions.create({
        model: cfg.llmModel,
        messages: [
          {
            role: "system",
            content:
              "You are an assistant for Karang Taruna pengurus. Write clear Indonesian summaries. Be concise and factual.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      })
      const text = res.choices[0]?.message?.content?.trim()
      if (!text) throw new Error("empty LLM response")
      return text
    },
  }
}

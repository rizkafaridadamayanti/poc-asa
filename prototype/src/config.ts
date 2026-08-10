import "dotenv/config"
import type { AppConfig } from "./types.js"

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v?.trim()) throw new Error(`Missing required env: ${name}`)
  return v.trim()
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`Invalid number env: ${name}`)
  return n
}

export function loadConfig(): AppConfig {
  return {
    port: intEnv("PORT", 3000),
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    authDir: process.env.AUTH_DIR?.trim() || "./auth_session",
    mongodbUri: requireEnv("MONGODB_URI"),
    dbName: process.env.DB_NAME?.trim() || "asa_karang_taruna",
    deepseekApiKey: requireEnv("DEEPSEEK_API_KEY"),
    llmBaseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.deepseek.com",
    llmModel: process.env.LLM_MODEL?.trim() || "deepseek-chat",
    reportToJid: requireEnv("REPORT_TO_JID"),
    testGroupJid: requireEnv("TEST_GROUP_JID"),
    jwtSecret: requireEnv("JWT_SECRET"),
    sendMinDelayMs: intEnv("SEND_MIN_DELAY_MS", 1000),
    sendMaxDelayMs: intEnv("SEND_MAX_DELAY_MS", 3000),
    dashboardPassword: process.env.DASHBOARD_PASSWORD?.trim() || "",
  }
}

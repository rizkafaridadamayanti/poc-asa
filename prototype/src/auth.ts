import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { UserModel } from "./models/user.js"
import type { Logger } from "./logger.js"

const SALT_ROUNDS = 10

function signToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: "7d" })
}

export async function registerUser(
  username: string,
  password: string,
  jwtSecret: string,
) {
  const existing = await UserModel.findOne({ username: username.toLowerCase().trim() })
  if (existing) {
    throw new Error("Username already taken")
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await UserModel.create({ username, passwordHash })
  const token = signToken(String(user._id), jwtSecret)
  return { token, user: { id: String(user._id), username: user.username } }
}

export async function loginUser(
  username: string,
  password: string,
  jwtSecret: string,
) {
  const user = await UserModel.findOne({ username: username.toLowerCase().trim() })
  if (!user) {
    throw new Error("Invalid username or password")
  }
  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    throw new Error("Invalid username or password")
  }
  const token = signToken(String(user._id), jwtSecret)
  return { token, user: { id: String(user._id), username: user.username } }
}

export function verifyToken(token: string, jwtSecret: string): { userId: string } {
  const payload = jwt.verify(token, jwtSecret) as { sub: string }
  return { userId: payload.sub }
}

export type AuthDeps = {
  jwtSecret: string
  log: Logger
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthDeps) {
  const { jwtSecret, log } = deps

  app.post<{ Body: { username?: string; password?: string } }>(
    "/api/auth/register",
    async (req, reply) => {
      const { username, password } = req.body || {}
      if (!username || !password) {
        return reply.code(400).send({ error: "username and password are required" })
      }
      if (password.length < 6) {
        return reply.code(400).send({ error: "password must be at least 6 characters" })
      }
      try {
        const result = await registerUser(username, password, jwtSecret)
        log.info({ username: result.user.username }, "user registered")
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : "registration failed"
        return reply.code(409).send({ error: msg })
      }
    },
  )

  app.post<{ Body: { username?: string; password?: string } }>(
    "/api/auth/login",
    async (req, reply) => {
      const { username, password } = req.body || {}
      if (!username || !password) {
        return reply.code(400).send({ error: "username and password are required" })
      }
      try {
        const result = await loginUser(username, password, jwtSecret)
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : "login failed"
        return reply.code(401).send({ error: msg })
      }
    },
  )
}

const BEARER_RE = /^bearer\s+(.+)$/i

export function extractBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const m = BEARER_RE.exec(header)
  return m ? m[1].trim() : null
}

export function createAuthMiddleware(jwtSecret: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearerToken(req)
    if (!token) {
      return reply.code(401).send({ error: "unauthorized" })
    }
    try {
      verifyToken(token, jwtSecret)
    } catch {
      return reply.code(401).send({ error: "invalid or expired token" })
    }
  }
}

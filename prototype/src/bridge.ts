import fs from "node:fs/promises"
import path from "node:path"
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import pino from "pino"
import { loadAuthState } from "./session.js"
import { isGroupJid, isStatusBroadcast } from "./jid.js"
import { bridgeEvents } from "./events.js"
import type { InboundMessage, InboundMessageType, WaBridge, WaDevice } from "./types.js"
import type { Logger } from "./logger.js"

export type BaileysBridgeOptions = {
  authDir: string
  mediaDir: string
  log: Logger
  sendMinDelayMs: number
  sendMaxDelayMs: number
}

const MEDIA_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "application/pdf": "pdf",
}

function extensionForMimetype(mimetype: string): string {
  return MEDIA_EXTENSION[mimetype] || mimetype.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin"
}

function extractMediaInfo(msg: WAMessage): { type: InboundMessageType; mimetype: string } | null {
  const m = msg.message
  if (!m) return null
  if (m.imageMessage) return { type: "image", mimetype: m.imageMessage.mimetype || "image/jpeg" }
  if (m.videoMessage) return { type: "video", mimetype: m.videoMessage.mimetype || "video/mp4" }
  if (m.audioMessage) return { type: "audio", mimetype: m.audioMessage.mimetype || "audio/ogg" }
  if (m.documentMessage) {
    return { type: "document", mimetype: m.documentMessage.mimetype || "application/octet-stream" }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function jitter(minMs: number, maxMs: number): number {
  const lo = Math.min(minMs, maxMs)
  const hi = Math.max(minMs, maxMs)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

function extractText(msg: WAMessage): string | null {
  const m = msg.message
  if (!m) return null
  if (m.conversation) return m.conversation
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text
  if (m.imageMessage?.caption) return m.imageMessage.caption
  if (m.videoMessage?.caption) return m.videoMessage.caption
  return null
}

async function mapInbound(msg: WAMessage, mediaDir: string, log: Logger): Promise<InboundMessage | null> {
  if (!msg.key?.id || !msg.key.remoteJid) return null
  if (msg.key.fromMe) return null
  const chatJid = msg.key.remoteJid
  if (isStatusBroadcast(chatJid)) return null
  const text = extractText(msg)
  const media = extractMediaInfo(msg)
  if (text == null && !media) return null

  const isGroup = isGroupJid(chatJid)
  const fromJid =
    (isGroup ? msg.key.participant : undefined) ||
    msg.key.remoteJid ||
    ""

  const ts =
    typeof msg.messageTimestamp === "number"
      ? msg.messageTimestamp
      : Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)

  let mediaFilename: string | null = null
  let mediaMimetype: string | null = null
  if (media) {
    try {
      const buffer = await downloadMediaMessage(msg, "buffer", {})
      const filename = `${msg.key.id}.${extensionForMimetype(media.mimetype)}`
      await fs.writeFile(path.join(mediaDir, filename), buffer)
      mediaFilename = filename
      mediaMimetype = media.mimetype
    } catch (err) {
      log.error({ err, messageId: msg.key.id }, "media download failed")
    }
  }

  return {
    messageId: msg.key.id,
    fromJid,
    chatJid,
    timestamp: ts,
    type: media ? media.type : "text",
    text: text ?? "",
    isGroup,
    mediaFilename,
    mediaMimetype,
  }
}

export function createBaileysBridge(opts: BaileysBridgeOptions): WaBridge {
  const { authDir, mediaDir, log, sendMinDelayMs, sendMaxDelayMs } = opts
  let sock: WASocket | null = null
  let connected = false
  let device: WaDevice | null = null
  let stopping = false
  const handlers: Array<(msg: InboundMessage) => void> = []
  let startPromise: Promise<void> | null = null

  const baileysLog = pino({ level: "silent" })

  async function connect(): Promise<void> {
    await fs.mkdir(mediaDir, { recursive: true })
    const { state, saveCreds } = await loadAuthState(authDir)
    const { version } = await fetchLatestBaileysVersion()
    log.info({ version }, "baileys version")

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLog),
      },
      logger: baileysLog,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    })

    sock = socket

    socket.ev.on("creds.update", saveCreds)

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update
      if (qr) {
        log.info("scan QR with WhatsApp (Linked Devices)")
        bridgeEvents.emitEvent({ type: "qr", qr })
      }
      if (connection === "open") {
        connected = true
        device = socket.user
          ? { id: socket.user.id, name: socket.user.name ?? null, platform: state.creds.platform ?? null }
          : null
        log.info("wa connected")
        bridgeEvents.emitEvent({ type: "connection", connected: true, device })
      }
      if (connection === "close") {
        connected = false
        device = null
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode
        const reason =
          statusCode === DisconnectReason.loggedOut ? "loggedOut" : "disconnected"
        const shouldReconnect =
          !stopping && statusCode !== DisconnectReason.loggedOut
        log.warn({ statusCode, shouldReconnect }, "wa disconnected")
        bridgeEvents.emitEvent({ type: "connection", connected: false, reason })
        if (shouldReconnect) {
          const delay = jitter(2000, 8000)
          setTimeout(() => {
            connect().catch((err) => log.error({ err }, "reconnect failed"))
          }, delay)
        } else if (statusCode === DisconnectReason.loggedOut) {
          log.error("logged out — delete auth_session and re-pair")
        }
      }
    })

    socket.ev.on("messages.upsert", ({ type, messages }) => {
      if (type !== "notify" && type !== "append") return
      void (async () => {
        for (const raw of messages) {
          const inbound = await mapInbound(raw, mediaDir, log)
          if (!inbound) continue
          bridgeEvents.emitEvent({ type: "inbound", message: inbound })
          for (const h of handlers) {
            try {
              h(inbound)
            } catch (err) {
              log.error({ err }, "onMessage handler error")
            }
          }
        }
      })()
    })
  }

  return {
    async start() {
      if (startPromise) return startPromise
      stopping = false
      startPromise = connect()
      return startPromise
    },
    async stop() {
      stopping = true
      connected = false
      device = null
      try {
        sock?.end(undefined)
      } catch {
        /* ignore */
      }
      sock = null
      startPromise = null
    },
    async sendText(toJid: string, text: string) {
      if (!sock || !connected) throw new Error("WA not connected")
      await sleep(jitter(sendMinDelayMs, sendMaxDelayMs))
      const result = await sock.sendMessage(toJid, { text })
      const id = result?.key?.id
      if (!id) throw new Error("send failed: no message id")
      return { id }
    },
    onMessage(handler) {
      handlers.push(handler)
    },
    isConnected() {
      return connected
    },
    getDeviceInfo() {
      return device
    },
    async getGroupMetadata(jid: string) {
      if (!sock || !connected) throw new Error("WA not connected")
      const meta = await sock.groupMetadata(jid)
      return { subject: meta.subject }
    },
    async listParticipatingGroups() {
      if (!sock || !connected) throw new Error("WA not connected")
      const groups = await sock.groupFetchAllParticipating()
      return Object.values(groups).map((g) => ({ id: g.id, subject: g.subject }))
    },
  }
}

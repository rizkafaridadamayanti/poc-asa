import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { bridgeEvents, type BridgeEvent } from "../events.js"
import type { WaBridge } from "../types.js"

let lastQr: string | null = null

bridgeEvents.onEvent((event) => {
  if (event.type === "qr") {
    lastQr = event.qr
  }
})

function serialize(event: BridgeEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function registerEventsApi(app: FastifyInstance, bridge: WaBridge) {
  app.get("/api/qr", async () => {
    return { connected: bridge.isConnected(), qr: lastQr }
  })

  app.get("/api/events", async (req: FastifyRequest, reply: FastifyReply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    })

    // Send current connection state immediately so the UI can sync on open.
    reply.raw.write(serialize({ type: "connection", connected: bridge.isConnected() }))

    const handler = (event: BridgeEvent) => {
      try {
        reply.raw.write(serialize(event))
      } catch {
        // Client likely disconnected; cleanup happens below.
      }
    }

    const cleanup = bridgeEvents.onEvent(handler)

    req.raw.on("close", () => {
      cleanup()
    })

    // Keep the handler alive until the request closes.
    await new Promise<void>((resolve) => {
      req.raw.on("close", resolve)
    })
  })
}

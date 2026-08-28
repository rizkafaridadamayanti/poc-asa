import { EventEmitter } from "events"
import type { InboundMessage, WaDevice } from "./types.js"

export type BridgeEvent =
  | { type: "qr"; qr: string }
  | { type: "connection"; connected: boolean; reason?: string; device?: WaDevice | null }
  | { type: "inbound"; message: InboundMessage }
  | { type: "spam-alert" }
  | { type: "idea" }

class BridgeEventBus extends EventEmitter {
  emitEvent(event: BridgeEvent): boolean {
    return this.emit("event", event)
  }

  onEvent(handler: (event: BridgeEvent) => void): () => void {
    this.on("event", handler)
    return () => this.off("event", handler)
  }
}

export const bridgeEvents = new BridgeEventBus()

import { toJid } from "./jid.js"
import { OutboundLogModel } from "./models/outboundLog.js"
import type { WaBridge } from "./types.js"

export async function sendOutbound(
  bridge: WaBridge,
  to: string,
  text: string,
  kind = "manual",
): Promise<{ id: string; jid: string }> {
  const jid = toJid(to)
  if (!text.trim()) throw new Error("text is required")

  try {
    const { id } = await bridge.sendText(jid, text)
    void OutboundLogModel.create({ toJid: jid, kind, text, ok: true, waMessageId: id }).catch(() => {})
    return { id, jid }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    void OutboundLogModel.create({ toJid: jid, kind, text, ok: false, error }).catch(() => {})
    throw err
  }
}

import { toJid } from "./jid.js"
import type { WaBridge } from "./types.js"

export async function sendOutbound(
  bridge: WaBridge,
  to: string,
  text: string,
): Promise<{ id: string; jid: string }> {
  const jid = toJid(to)
  if (!text.trim()) throw new Error("text is required")
  const { id } = await bridge.sendText(jid, text)
  return { id, jid }
}

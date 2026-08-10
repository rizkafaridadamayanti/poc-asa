/** Normalize phone / bare id to WhatsApp JID. */
export function toJid(input: string): string {
  const s = input.trim()
  if (s.includes("@")) return s
  const digits = s.replace(/\D/g, "")
  if (!digits) throw new Error("Invalid JID / phone")
  return `${digits}@s.whatsapp.net`
}

export function isStatusBroadcast(jid: string): boolean {
  return jid === "status@broadcast"
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us")
}

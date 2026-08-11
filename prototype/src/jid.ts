/** Normalize phone / bare id to WhatsApp JID. */
export function toJid(input: string): string {
  const s = input.trim()
  if (s.includes("@")) return s
  let digits = s.replace(/\D/g, "")
  if (!digits) throw new Error("Invalid JID / phone")
  // Indonesian local format (0812...) -> international (62812...), same as WA itself expects.
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`
  }
  return `${digits}@s.whatsapp.net`
}

export function isStatusBroadcast(jid: string): boolean {
  return jid === "status@broadcast"
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us")
}

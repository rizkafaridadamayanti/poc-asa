import { MessageModel } from "./models/message.js"
import { SpamAlertModel } from "./models/spamAlert.js"
import { SPAM_ALERT_THRESHOLD } from "./spam.js"
import { getGroupScope, isVisibleTo, allowedGroupJids } from "./acl.js"
import type { GroupScope } from "./models/group.js"
import type { LlmClient } from "./llm.js"

export type QaResult = { answer: string; sourceMessageIds: string[] }

const CONTEXT_LIMIT = 50
const SPAM_CONTEXT_LIMIT = 15
// Over-fetch alerts so ACL filtering still leaves enough to fill SPAM_CONTEXT_LIMIT.
const SPAM_FETCH_LIMIT = SPAM_CONTEXT_LIMIT * 3

const SYSTEM_PROMPT = [
  "You are a Q&A assistant for Karang Taruna members. Answer ONLY from the provided context",
  "(chat history + spam alerts). Never invent facts, names, numbers, or dates not in the context.",
  "If the context does not contain the answer, say so plainly.",
  'For date questions like "hari ini" / "minggu ini", compare each item\'s timestamp against the',
  '"Tanggal & waktu sekarang" line.',
  "",
  'SPAM QUESTIONS: if the spam section says "DI LUAR WEWENANG", follow that instruction exactly —',
  "the asker is not a Pengurus and must not be told whether spam exists. Otherwise: each entry",
  "under the spam alerts IS a spam/fraud message the system caught. Treat every entry as real spam",
  'UNLESS its status is "ditinjau — BUKAN spam". Do NOT distinguish "detected" from "confirmed" —',
  "an alert awaiting review still counts. When asked whether there is spam/penipuan in some period,",
  'LEAD with "Ya, ada ..." if at least one non-cleared alert falls in that period, or',
  '"Tidak, tidak ada ..." if none do. Never open with a negative and then list matching alerts.',
  "",
  "Reply in Indonesian, concise.",
].join(" ")

const SPAM_STATUS_LABEL: Record<string, string> = {
  open: "menunggu peninjauan Pusat",
  confirmed: "dikonfirmasi spam oleh Pusat",
  dismissed: "ditinjau — BUKAN spam",
}

/** Waktu Indonesia Barat (UTC+7) — the timezone every Karang Taruna user is in. */
function fmtWib(d: Date | string | number): string {
  return new Date(d).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Recent spam/fraud alerts as context for "apakah ada spam?".
 *
 * Spam alerts are Pengurus-tier moderation data: returns null for an anggota
 * requester (they must not learn what the system flagged). For dusun/pusat the
 * list is still scope-gated the same way chat history is (a pusat-chat alert
 * never reaches dusun; a DM JID counts as the lowest tier). Verbatim spam text
 * and sender numbers are always left out — echoing them re-exposes the scam.
 */
async function buildSpamContext(
  requesterScope: GroupScope,
): Promise<{ text: string; messageIds: string[] } | null> {
  if (requesterScope === "anggota") return null

  const alerts = await SpamAlertModel.find({}).sort({ createdAt: -1 }).limit(SPAM_FETCH_LIMIT).lean()

  const scopeByJid = new Map<string, GroupScope>()
  const lines: string[] = []
  const messageIds: string[] = []
  for (const a of alerts) {
    if (lines.length >= SPAM_CONTEXT_LIMIT) break
    let scope = scopeByJid.get(a.chatJid)
    if (!scope) {
      scope = await getGroupScope(a.chatJid)
      scopeByJid.set(a.chatJid, scope)
    }
    if (!isVisibleTo(scope, requesterScope)) continue
    const status = SPAM_STATUS_LABEL[a.status] ?? a.status
    const indikasi = a.reasons.length > 0 ? `, indikasi: ${a.reasons.join("; ")}` : ""
    lines.push(`[${fmtWib(a.createdAt)} WIB] skor ${a.spamScore}/100, ${status}${indikasi}`)
    messageIds.push(a.messageId)
  }
  return { text: lines.join("\n"), messageIds }
}

/** Retrieval is scope-gated: a requester never sees pusat-scoped chat unless they are pusat themselves. */
export async function answerQuestion(opts: {
  question: string
  llm: LlmClient
  requesterScope: GroupScope
  scopeGroupJid?: string
}): Promise<QaResult> {
  const { question, llm, requesterScope, scopeGroupJid } = opts
  if (!question.trim()) throw new Error("question is required")

  let chatJids: string[]
  if (scopeGroupJid) {
    const groupScope = await getGroupScope(scopeGroupJid)
    if (!isVisibleTo(groupScope, requesterScope)) {
      throw new Error("not allowed to query this group's history")
    }
    chatJids = [scopeGroupJid]
  } else {
    chatJids = await allowedGroupJids(requesterScope)
  }

  // Messages that tripped the spam filter are kept out of the Q&A context: their
  // verbatim text would otherwise let a bot reply echo the scam back out.
  const msgs = await MessageModel.find({
    chatJid: { $in: chatJids },
    type: "text",
    // $not/$gte also matches docs where the field is missing or null
    "flags.spamScore": { $not: { $gte: SPAM_ALERT_THRESHOLD } },
  })
    .sort({ timestamp: -1 })
    .limit(CONTEXT_LIMIT)
    .lean()

  const ordered = msgs.slice().reverse()
  const context = ordered.map((m) => `[${fmtWib(m.timestamp * 1000)} WIB] ${m.fromJid}: ${m.text}`).join("\n")

  const spam = await buildSpamContext(requesterScope)

  const spamSection = spam
    ? `Peringatan spam/fraud yang sudah terdeteksi sistem (${spam.messageIds.length}):\n${spam.text || "(tidak ada peringatan spam)"}`
    : "Peringatan spam/fraud: DI LUAR WEWENANG. Penanya bukan Pengurus. Kalau pertanyaannya soal spam/penipuan/keamanan, jawab bahwa informasi itu hanya untuk Pengurus (Dusun/Pusat) dan sarankan menghubungi Pengurus — jangan konfirmasi maupun bantah ada/tidaknya spam."

  const prompt = `Tanggal & waktu sekarang: ${fmtWib(Date.now())} WIB

Pertanyaan: "${question}"

Konteks chat yang boleh diakses (${ordered.length} pesan terbaru):
${context || "(tidak ada riwayat chat yang relevan)"}

${spamSection}

Jawab pertanyaan hanya berdasarkan konteks di atas. Kalau tidak ada info relevan, bilang terus terang tidak tahu.`

  const answer = await llm.complete(prompt, SYSTEM_PROMPT)
  return { answer, sourceMessageIds: [...ordered.map((m) => m.messageId), ...(spam?.messageIds ?? [])] }
}

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

const SYSTEM_PROMPT =
  "You are a Q&A assistant for Karang Taruna members. Answer ONLY from the provided context " +
  "(chat history + spam alerts). Never invent facts, names, numbers, or dates that are not in the " +
  "context. If the context does not contain the answer, say so plainly. For date questions like " +
  '"hari ini", compare each item\'s timestamp against the "Tanggal & waktu sekarang" line. ' +
  'A spam alert with status "ditandai bukan spam" was reviewed and cleared — do not report it as active spam. ' +
  "Reply in Indonesian, concise."

const SPAM_STATUS_LABEL: Record<string, string> = {
  open: "belum ditinjau",
  confirmed: "dikonfirmasi sebagai spam",
  dismissed: "ditandai bukan spam",
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
 * Recent spam/fraud alerts the requester may see, as context for "apakah ada spam?".
 * Unlike chat history these also cover japri, and are scope-gated the same way
 * (a pusat-chat alert never reaches a lower tier; a DM JID counts as lowest tier).
 * Verbatim spam text and sender numbers are left out on purpose — echoing them in
 * a bot reply re-exposes the scam — so only meta goes in.
 */
async function buildSpamContext(requesterScope: GroupScope): Promise<{ text: string; messageIds: string[] }> {
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

  const prompt = `Tanggal & waktu sekarang: ${fmtWib(Date.now())} WIB

Pertanyaan: "${question}"

Konteks chat yang boleh diakses (${ordered.length} pesan terbaru):
${context || "(tidak ada riwayat chat yang relevan)"}

Peringatan spam/fraud yang sudah terdeteksi sistem (${spam.messageIds.length}):
${spam.text || "(tidak ada peringatan spam)"}

Jawab pertanyaan hanya berdasarkan konteks di atas. Kalau tidak ada info relevan, bilang terus terang tidak tahu.`

  const answer = await llm.complete(prompt, SYSTEM_PROMPT)
  return { answer, sourceMessageIds: [...ordered.map((m) => m.messageId), ...spam.messageIds] }
}

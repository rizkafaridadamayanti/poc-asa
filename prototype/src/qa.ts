import { MessageModel } from "./models/message.js"
import { getGroupScope, isVisibleTo, allowedGroupJids } from "./acl.js"
import type { GroupScope } from "./models/group.js"
import type { LlmClient } from "./llm.js"

export type QaResult = { answer: string; sourceMessageIds: string[] }

const CONTEXT_LIMIT = 50

const SYSTEM_PROMPT =
  "You are a Q&A assistant for Karang Taruna members. Answer only from the provided chat context. " +
  "If the context doesn't contain the answer, say so plainly instead of guessing. Reply in Indonesian, concise."

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

  const msgs = await MessageModel.find({ chatJid: { $in: chatJids }, type: "text" })
    .sort({ timestamp: -1 })
    .limit(CONTEXT_LIMIT)
    .lean()

  const ordered = msgs.slice().reverse()
  const context = ordered
    .map((m) => `[${new Date(m.timestamp * 1000).toISOString()}] ${m.fromJid}: ${m.text}`)
    .join("\n")

  const prompt = `Pertanyaan: "${question}"

Konteks chat yang boleh diakses (${ordered.length} pesan terbaru):
${context || "(tidak ada riwayat chat yang relevan)"}

Jawab pertanyaan berdasarkan konteks di atas. Kalau tidak ada info relevan, bilang terus terang tidak tahu.`

  const answer = await llm.complete(prompt, SYSTEM_PROMPT)
  return { answer, sourceMessageIds: ordered.map((m) => m.messageId) }
}

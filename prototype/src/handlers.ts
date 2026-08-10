import { MessageModel } from "./models/message.js"
import { ParticipantModel } from "./models/participant.js"
import type { InboundMessage } from "./types.js"
import type { Logger } from "./logger.js"

const IDEA_KEYWORDS = /\b(usul|usulan|saran|ide|gimana kalau|bagaimana kalau|proposal|inisiatif)\b/i

function looksLikeIdea(text: string): boolean {
  return IDEA_KEYWORDS.test(text)
}

export function createInboundHandler(log: Logger) {
  return async function handleInbound(msg: InboundMessage): Promise<void> {
    try {
      await MessageModel.updateOne(
        { messageId: msg.messageId },
        {
          $setOnInsert: {
            messageId: msg.messageId,
            fromJid: msg.fromJid,
            chatJid: msg.chatJid,
            timestamp: msg.timestamp,
            type: msg.type,
            text: msg.text,
            isGroup: msg.isGroup,
            flags: { spamScore: 0, sentiment: "", isIdea: looksLikeIdea(msg.text) },
          },
        },
        { upsert: true },
      )

      await ParticipantModel.updateOne(
        { waJid: msg.fromJid },
        { $setOnInsert: { waJid: msg.fromJid, displayName: "" } },
        { upsert: true },
      )

      log.info(
        {
          messageId: msg.messageId,
          chatJid: msg.chatJid,
          fromJid: msg.fromJid,
          isGroup: msg.isGroup,
          text: msg.text.slice(0, 120),
        },
        "inbound stored",
      )
    } catch (err) {
      log.error({ err, messageId: msg.messageId }, "inbound store failed")
    }
  }
}

import { MessageModel } from "./models/message.js"
import { ParticipantModel } from "./models/participant.js"
import { GroupModel } from "./models/group.js"
import { answerQuestion } from "./qa.js"
import { sendOutbound } from "./sender.js"
import type { InboundMessage, WaBridge } from "./types.js"
import type { LlmClient } from "./llm.js"
import type { Logger } from "./logger.js"

// Used only to tag messages for Infografis' "active vs contributive" stat
// (see stats.ts getContributiveStats), not tied to any dedicated idea-intake feature.
const IDEA_KEYWORDS = /\b(usul|usulan|saran|ide|gimana kalau|bagaimana kalau|proposal|inisiatif)\b/i
const ASK_CMD_RE = /^\/tanya\s+([\s\S]+)/i

function looksLikeIdea(text: string): boolean {
  return IDEA_KEYWORDS.test(text)
}

/**
 * Registers a group the first time the bot sees a message from it, with scope left
 * unset so it stays out of automated jobs (digest/ACL) until Pusat reviews it.
 * The DB existence check is cheap and skips the WA metadata round-trip for groups
 * we already know; findOneAndUpdate + the unique index on waJid make the insert
 * itself race-safe if two messages from a brand-new group land at once.
 */
async function autoRegisterGroup(bridge: WaBridge, chatJid: string, log: Logger): Promise<void> {
  try {
    const known = await GroupModel.exists({ waJid: chatJid })
    if (known) return

    let name = ""
    try {
      const meta = await bridge.getGroupMetadata(chatJid)
      name = meta.subject
    } catch (err) {
      log.warn({ err, chatJid }, "auto-register: could not fetch group metadata, using blank name")
    }

    const res = await GroupModel.findOneAndUpdate(
      { waJid: chatJid },
      { $setOnInsert: { waJid: chatJid, name, scope: null, dusunId: null, source: "auto" } },
      { upsert: true, setDefaultsOnInsert: true, rawResult: true },
    )
    if (!res.lastErrorObject?.updatedExisting) {
      log.info({ chatJid, name }, "group auto-registered, needs scope review")
    }
  } catch (err) {
    log.error({ err, chatJid }, "auto-register group failed")
  }
}

async function handleAskCommand(
  bridge: WaBridge,
  replyToJid: string,
  question: string,
  llm: LlmClient,
  log: Logger,
): Promise<void> {
  try {
    // DM Q&A defaults to the lowest ACL scope — japri can come from any member, not just Pusat.
    const { answer } = await answerQuestion({ question, llm, requesterScope: "anggota" })
    await sendOutbound(bridge, replyToJid, answer, "qa-reply")
  } catch (err) {
    log.error({ err }, "qa command failed")
    try {
      await sendOutbound(
        bridge,
        replyToJid,
        "Maaf, lagi ada gangguan jawab pertanyaan. Coba lagi nanti ya.",
        "qa-reply",
      )
    } catch {
      /* ignore */
    }
  }
}

export function createInboundHandler(log: Logger, bridge: WaBridge, llm: LlmClient) {
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
            mediaFilename: msg.mediaFilename ?? null,
            mediaMimetype: msg.mediaMimetype ?? null,
            flags: { sentiment: "", isIdea: looksLikeIdea(msg.text) },
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

      if (msg.isGroup) {
        void autoRegisterGroup(bridge, msg.chatJid, log)
      }

      if (!msg.isGroup) {
        const askMatch = ASK_CMD_RE.exec(msg.text)
        if (askMatch) {
          void handleAskCommand(bridge, msg.fromJid, askMatch[1], llm, log)
        }
      }
    } catch (err) {
      log.error({ err, messageId: msg.messageId }, "inbound store failed")
    }
  }
}

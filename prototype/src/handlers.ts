import { MessageModel } from "./models/message.js"
import { ParticipantModel } from "./models/participant.js"
import { GroupModel } from "./models/group.js"
import { SpamAlertModel } from "./models/spamAlert.js"
import { AnonymousIdeaModel } from "./models/anonymousIdea.js"
import { checkSpam, SPAM_ALERT_THRESHOLD, type SpamCheckResult } from "./spam.js"
import { answerQuestion } from "./qa.js"
import { sendOutbound } from "./sender.js"
import { getSettings } from "./settings.js"
import type { InboundMessage, WaBridge } from "./types.js"
import type { LlmClient } from "./llm.js"
import type { Logger } from "./logger.js"

// Also feeds Infografis' "active vs contributive" stat (see stats.ts getContributiveStats).
const IDEA_KEYWORDS = /\b(usul|usulan|saran|ide|gimana kalau|bagaimana kalau|proposal|inisiatif)\b/i
const IDEA_CMD_RE = /^\/ide\s+([\s\S]+)/i
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

async function handleSpamAlert(
  bridge: WaBridge,
  msg: InboundMessage,
  spam: SpamCheckResult,
  log: Logger,
): Promise<void> {
  try {
    const existing = await SpamAlertModel.findOne({ messageId: msg.messageId }).lean()
    if (existing) return

    await SpamAlertModel.create({
      messageId: msg.messageId,
      chatJid: msg.chatJid,
      fromJid: msg.fromJid,
      text: msg.text,
      spamScore: spam.score,
      reasons: spam.reasons,
      notified: false,
      status: "open",
    })

    const { reportToJid } = getSettings()
    const preview = msg.text.length > 200 ? `${msg.text.slice(0, 200)}…` : msg.text
    const alertText = `*Spam/Fraud Alert*\nScore: ${spam.score}/100\nDari: ${msg.fromJid}\nDi: ${msg.chatJid}\nAlasan: ${spam.reasons.join(", ")}\n\nPesan:\n${preview}`
    await sendOutbound(bridge, reportToJid, alertText, "spam-alert")
    await SpamAlertModel.updateOne({ messageId: msg.messageId }, { $set: { notified: true } })
  } catch (err) {
    log.error({ err, messageId: msg.messageId }, "spam alert failed")
  }
}

async function handleAnonymousIdea(
  bridge: WaBridge,
  replyToJid: string,
  rawText: string,
  log: Logger,
): Promise<void> {
  try {
    await AnonymousIdeaModel.create({ text: rawText.trim() })
    await sendOutbound(
      bridge,
      replyToJid,
      "Ide kamu sudah tercatat secara anonim buat Pengurus Pusat. Makasih!",
      "idea-ack",
    )
  } catch (err) {
    log.error({ err }, "anonymous idea intake failed")
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
      const spam = checkSpam(msg.text)

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
            flags: { spamScore: spam.score, sentiment: "", isIdea: looksLikeIdea(msg.text) },
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
          spamScore: spam.score,
          text: msg.text.slice(0, 120),
        },
        "inbound stored",
      )

      if (spam.score >= SPAM_ALERT_THRESHOLD) {
        void handleSpamAlert(bridge, msg, spam, log)
      }

      if (msg.isGroup) {
        void autoRegisterGroup(bridge, msg.chatJid, log)
      }

      if (!msg.isGroup) {
        const ideaMatch = IDEA_CMD_RE.exec(msg.text)
        const askMatch = ASK_CMD_RE.exec(msg.text)
        if (ideaMatch) {
          void handleAnonymousIdea(bridge, msg.fromJid, ideaMatch[1], log)
        } else if (askMatch) {
          void handleAskCommand(bridge, msg.fromJid, askMatch[1], llm, log)
        }
      }
    } catch (err) {
      log.error({ err, messageId: msg.messageId }, "inbound store failed")
    }
  }
}

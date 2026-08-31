import { MessageModel } from "./models/message.js"
import { ParticipantModel } from "./models/participant.js"
import { GroupModel } from "./models/group.js"
import { SpamAlertModel } from "./models/spamAlert.js"
import { AnonymousIdeaModel } from "./models/anonymousIdea.js"
import { checkSpam, SPAM_ALERT_THRESHOLD, type SpamCheckResult } from "./spam.js"
import { requesterFromGroup, resolveRequester, type Requester } from "./acl.js"
import { answerQuestion } from "./qa.js"
import { sendOutbound } from "./sender.js"
import { getSettings } from "./settings.js"
import { bridgeEvents } from "./events.js"
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
    let ownerJid: string | null = null
    let groupCreatedAt: Date | null = null
    let description = ""
    try {
      const meta = await bridge.getGroupMetadata(chatJid)
      name = meta.subject
      ownerJid = meta.ownerJid
      groupCreatedAt = meta.creation ? new Date(meta.creation * 1000) : null
      description = meta.desc ?? ""
    } catch (err) {
      log.warn({ err, chatJid }, "auto-register: could not fetch group metadata, using blank name")
    }

    const res = await GroupModel.findOneAndUpdate(
      { waJid: chatJid },
      {
        $setOnInsert: {
          waJid: chatJid,
          name,
          scope: null,
          dusunId: null,
          source: "auto",
          ownerJid,
          groupCreatedAt,
          description,
        },
      },
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
    // Emitted only after the DB write actually lands, so the dashboard's badge
    // count never races ahead of (or lags behind) the real "open" alert count.
    bridgeEvents.emitEvent({ type: "spam-alert" })

    // The WA notification is deliberately detail-free: forwarding the raw spam
    // text / sender number over WhatsApp re-exposes the scam (and can trip WA's
    // own spam filters on the bot). Full detail lives in the dashboard.
    const { reportToJid } = getSettings()
    const alertText =
      "*Peringatan Keamanan*\nSistem mendeteksi dan menahan sebuah pesan yang terindikasi spam/penipuan."
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
    bridgeEvents.emitEvent({ type: "idea" })
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

/**
 * /tanya, in a group or via japri. The ACL position is resolved differently for
 * each (group's own label vs the sender's group memberships, see acl.ts), then
 * the answer is drawn from whatever that position is allowed to read.
 */
async function handleAskCommand(
  bridge: WaBridge,
  msg: InboundMessage,
  question: string,
  llm: LlmClient,
  log: Logger,
): Promise<void> {
  const replyToJid = msg.isGroup ? msg.chatJid : msg.fromJid

  let requester: Requester
  if (msg.isGroup) {
    const group = await GroupModel.findOne({ waJid: msg.chatJid })
      .select("scope dusunId")
      .lean<{ scope?: string | null; dusunId?: string | null } | null>()
    requester = requesterFromGroup(group?.scope ?? null, group?.dusunId ?? null)
    if (requester.tier === "none") {
      await sendOutbound(bridge, replyToJid, "Grup ini belum dikategorikan Pengurus, jadi /tanya belum aktif di sini.", "qa-reply")
      return
    }
    if (requester.tier !== "pusat" && requester.dusunIds.length === 0) {
      await sendOutbound(bridge, replyToJid, "Grup ini belum punya Dusun ID. Minta Pengurus mengaturnya dulu.", "qa-reply")
      return
    }
  } else {
    requester = await resolveRequester(msg.fromJid)
    if (requester.tier === "none") {
      await sendOutbound(
        bridge,
        replyToJid,
        "Maaf, nomor kamu belum terdaftar sebagai anggota grup mana pun, jadi belum bisa diberi informasi. Kamu tetap bisa kirim ide lewat /ide.",
        "qa-reply",
      )
      return
    }
  }

  try {
    const { answer } = await answerQuestion({ question, llm, requester })
    await sendOutbound(bridge, replyToJid, answer, "qa-reply")
  } catch (err) {
    log.error({ err }, "qa command failed")
    try {
      await sendOutbound(bridge, replyToJid, "Maaf, lagi ada gangguan jawab pertanyaan. Coba lagi nanti ya.", "qa-reply")
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

      const ideaMatch = IDEA_CMD_RE.exec(msg.text)
      const askMatch = ASK_CMD_RE.exec(msg.text)
      if (askMatch) {
        void handleAskCommand(bridge, msg, askMatch[1], llm, log)
      } else if (ideaMatch && !msg.isGroup) {
        // /ide stays DM-only: submitting it from a group would not be anonymous.
        void handleAnonymousIdea(bridge, msg.fromJid, ideaMatch[1], log)
      }
    } catch (err) {
      log.error({ err, messageId: msg.messageId }, "inbound store failed")
    }
  }
}

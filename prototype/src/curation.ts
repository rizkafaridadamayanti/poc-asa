import { CuratedInfoModel, type CuratedInfoType } from "./models/curated_info.js"
import { sendOutbound } from "./sender.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

const TYPE_LABEL: Record<CuratedInfoType, string> = {
  beasiswa: "Info Beasiswa",
  loker: "Info Magang/Loker",
  inovasi: "Info Inovasi",
}

export type FanOutResult = {
  targets: number
  sent: number
  failed: Array<{ jid: string; error: string }>
}

/** Sends a curated info to every target. Only "draft" or "scheduled" items may still send. */
export async function fanOutCuratedInfo(
  id: string,
  bridge: WaBridge,
  log: Logger,
): Promise<FanOutResult> {
  const doc = await CuratedInfoModel.findOne({ _id: id, status: { $in: ["draft", "scheduled"] } })
  if (!doc) {
    const exists = await CuratedInfoModel.exists({ _id: id })
    throw new Error(exists ? "cannot send: item was already sent" : "curated info not found")
  }
  if (doc.targets.length === 0) throw new Error("add at least one target before sending")
  if (!bridge.isConnected()) throw new Error("WA not connected")

  const text = `*${TYPE_LABEL[doc.type as CuratedInfoType]}*\n${doc.title}\n\n${doc.body}`

  const failed: Array<{ jid: string; error: string }> = []
  let sent = 0
  for (const target of doc.targets) {
    try {
      await sendOutbound(bridge, target, text, "curated-info")
      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.error({ err, target, curatedInfoId: id }, "curated info fan-out failed for target")
      failed.push({ jid: target, error: message })
    }
  }

  doc.status = "sent"
  doc.sentAt = new Date()
  await doc.save()

  log.info({ curatedInfoId: id, sent, failed: failed.length }, "curated info fan-out complete")
  return { targets: doc.targets.length, sent, failed }
}

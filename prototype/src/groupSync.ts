import cron, { type ScheduledTask } from "node-cron"
import { GroupModel } from "./models/group.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

/**
 * Refresh every participating group's membership + metadata from WhatsApp.
 * Membership (`participants`) is what resolveRequester() reads to decide a
 * japri sender's ACL tier, so it needs to stay reasonably fresh.
 */
export async function syncGroupsFromWhatsApp(
  bridge: WaBridge,
  log: Logger,
): Promise<{ scanned: number; created: number }> {
  const participating = await bridge.listParticipatingGroups()
  let created = 0
  for (const g of participating) {
    const res = await GroupModel.findOneAndUpdate(
      { waJid: g.id },
      {
        $set: {
          participants: g.participants,
          ownerJid: g.ownerJid,
          groupCreatedAt: g.creation ? new Date(g.creation * 1000) : null,
          description: g.desc ?? "",
        },
        $setOnInsert: { waJid: g.id, name: g.subject, scope: null, dusunId: null, source: "auto" },
      },
      { upsert: true, setDefaultsOnInsert: true, rawResult: true },
    )
    if (!res.lastErrorObject?.updatedExisting) created++
  }
  log.info({ scanned: participating.length, created }, "groups synced from WhatsApp")
  return { scanned: participating.length, created }
}

/** Periodic membership refresh + one run shortly after startup. */
export function startGroupSyncCron(bridge: WaBridge, log: Logger, schedule = "0 */3 * * *"): ScheduledTask {
  const run = async () => {
    if (!bridge.isConnected()) return
    try {
      await syncGroupsFromWhatsApp(bridge, log)
    } catch (err) {
      log.error({ err }, "group auto-sync failed")
    }
  }
  setTimeout(() => void run(), 15_000)
  return cron.schedule(schedule, () => void run())
}

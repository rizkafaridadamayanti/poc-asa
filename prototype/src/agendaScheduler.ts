import { AgendaModel } from "./models/agenda.js"
import { sendOutbound } from "./sender.js"
import type { WaBridge } from "./types.js"
import type { Logger } from "./logger.js"

export type AgendaScheduler = { stop: () => void }

function buildReminderText(agenda: { title: string; description: string; dueAt: Date }): string {
  const due = agenda.dueAt.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })
  const desc = agenda.description ? `\n\n${agenda.description}` : ""
  return `*Pengingat Agenda*\n${agenda.title}\nJatuh tempo: ${due}${desc}`
}

async function fireDueReminders(bridge: WaBridge, log: Logger): Promise<void> {
  if (!bridge.isConnected()) return

  const now = new Date()
  const due = await AgendaModel.find({
    trash: { $ne: true },
    remindAt: { $elemMatch: { at: { $lte: now }, sent: false } },
  })

  for (const agenda of due) {
    const text = buildReminderText(agenda)
    let fired = false

    for (const reminder of agenda.remindAt) {
      if (reminder.sent || reminder.at > now) continue
      fired = true
      // sendOutbound -> bridge.sendText already waits a randomized human-like
      // delay before each send, so this loop doesn't need its own throttling.
      for (const jid of agenda.audience) {
        try {
          await sendOutbound(bridge, jid, text, "agenda-reminder")
        } catch (err) {
          log.error({ err, agendaId: String(agenda._id), jid }, "agenda reminder send failed")
        }
      }
      reminder.sent = true
      reminder.sentAt = now
      log.info({ agendaId: String(agenda._id), remindAt: reminder.at }, "agenda reminder fired")
    }

    if (fired) await agenda.save()
  }
}

export function startAgendaScheduler(bridge: WaBridge, log: Logger, intervalMs = 60_000): AgendaScheduler {
  const tick = () => {
    fireDueReminders(bridge, log).catch((err) => log.error({ err }, "agenda scheduler tick failed"))
  }
  tick()
  const handle = setInterval(tick, intervalMs)
  return { stop: () => clearInterval(handle) }
}

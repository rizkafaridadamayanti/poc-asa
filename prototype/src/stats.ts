import { MessageModel } from "./models/message.js"
import { GroupModel } from "./models/group.js"

export type ContributiveRow = { waJid: string; messageCount: number; ideaCount: number }
export type PeakHourRow = { hour: number; count: number }
export type DusunRow = { dusunId: string; groupCount: number }

export async function getContributiveStats(): Promise<ContributiveRow[]> {
  const rows = await MessageModel.aggregate([
    {
      $group: {
        _id: "$fromJid",
        messageCount: { $sum: 1 },
        ideaCount: { $sum: { $cond: ["$flags.isIdea", 1, 0] } },
      },
    },
    { $sort: { messageCount: -1 } },
  ])
  return rows.map((r) => ({ waJid: r._id, messageCount: r.messageCount, ideaCount: r.ideaCount }))
}

export async function getPeakHours(): Promise<PeakHourRow[]> {
  const rows = await MessageModel.aggregate([
    { $addFields: { hour: { $hour: { $toDate: { $multiply: ["$timestamp", 1000] } } } } },
    { $group: { _id: "$hour", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  return rows.map((r) => ({ hour: r._id, count: r.count }))
}

export async function getGroupsByDusun(): Promise<DusunRow[]> {
  const rows = await GroupModel.aggregate([
    { $match: { dusunId: { $nin: [null, ""] } } },
    { $group: { _id: "$dusunId", groupCount: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  return rows.map((r) => ({ dusunId: r._id, groupCount: r.groupCount }))
}

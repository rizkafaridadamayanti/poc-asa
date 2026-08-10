import { GroupModel, type GroupDoc, type GroupScope } from "./models/group.js"

const DEFAULT_SCOPE: GroupScope = "anggota"

export async function getGroupScope(waJid: string): Promise<GroupScope> {
  const group = await GroupModel.findOne({ waJid }).lean<GroupDoc | null>()
  return group?.scope ?? DEFAULT_SCOPE
}

/** Pusat sees everything; dusun/anggota requesters never see pusat-scoped content. */
export function isVisibleTo(contentScope: GroupScope, requesterScope: GroupScope): boolean {
  if (requesterScope === "pusat") return true
  return contentScope !== "pusat"
}

export async function allowedGroupJids(requesterScope: GroupScope): Promise<string[]> {
  const query = requesterScope === "pusat" ? {} : { scope: { $ne: "pusat" } }
  const groups = await GroupModel.find(query).select("waJid").lean()
  return groups.map((g) => g.waJid)
}

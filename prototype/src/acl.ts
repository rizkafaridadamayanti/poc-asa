import { GroupModel, type GroupDoc, type GroupScope } from "./models/group.js"

const DEFAULT_SCOPE: GroupScope = "anggota"

/** Higher number = higher tier. Pusat sees everything; Anggota sees only its own tier. */
const SCOPE_LEVEL: Record<GroupScope, number> = { anggota: 1, dusun: 2, pusat: 3 }

export async function getGroupScope(waJid: string): Promise<GroupScope> {
  const group = await GroupModel.findOne({ waJid }).lean<GroupDoc | null>()
  return group?.scope ?? DEFAULT_SCOPE
}

/**
 * Strict 3-tier hierarchy: content is visible only to requesters at its own tier
 * or higher. Pusat (top) sees Dusun and Anggota content; Dusun (middle) sees
 * Anggota content but not Pusat; Anggota (bottom) sees only Anggota content.
 * Information never leaks downward to a lower tier.
 */
export function isVisibleTo(contentScope: GroupScope, requesterScope: GroupScope): boolean {
  return SCOPE_LEVEL[requesterScope] >= SCOPE_LEVEL[contentScope]
}

export async function allowedGroupJids(requesterScope: GroupScope): Promise<string[]> {
  // Groups still awaiting scope review (scope: null) stay Pusat-only until
  // someone classifies them — unreviewed content never leaks to lower tiers either.
  if (requesterScope === "pusat") {
    const groups = await GroupModel.find({}).select("waJid").lean()
    return groups.map((g) => g.waJid)
  }
  const requesterLevel = SCOPE_LEVEL[requesterScope]
  const visibleScopes = (Object.keys(SCOPE_LEVEL) as GroupScope[]).filter(
    (s) => SCOPE_LEVEL[s] <= requesterLevel,
  )
  const groups = await GroupModel.find({ scope: { $in: visibleScopes } }).select("waJid").lean()
  return groups.map((g) => g.waJid)
}

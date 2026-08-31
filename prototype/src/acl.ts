import { GroupModel, type GroupScope } from "./models/group.js"

const DEFAULT_SCOPE: GroupScope = "anggota"

/**
 * Who is asking, resolved to an ACL position:
 * - pusat   → may read every group
 * - dusun   → may read the dusun/anggota groups of its own dusun(s)
 * - anggota → may read the anggota groups of its own dusun(s)
 * - none    → the number is in no classified group; gets no information
 */
export type Requester =
  | { tier: "pusat" }
  | { tier: "dusun"; dusunIds: string[] }
  | { tier: "anggota"; dusunIds: string[] }
  | { tier: "none" }

export async function getGroupScope(waJid: string): Promise<GroupScope> {
  const group = await GroupModel.findOne({ waJid }).select("scope").lean<{ scope?: GroupScope | null } | null>()
  return group?.scope ?? DEFAULT_SCOPE
}

function uniqueDusunIds(groups: Array<{ dusunId?: string | null }>): string[] {
  return [...new Set(groups.map((g) => g.dusunId).filter((d): d is string => !!d))]
}

/** ACL position of a WhatsApp group running /tanya — straight from its own label. */
export function requesterFromGroup(scope: string | null | undefined, dusunId: string | null): Requester {
  if (scope === "pusat") return { tier: "pusat" }
  if (scope === "dusun") return { tier: "dusun", dusunIds: dusunId ? [dusunId] : [] }
  if (scope === "anggota") return { tier: "anggota", dusunIds: dusunId ? [dusunId] : [] }
  return { tier: "none" } // unreviewed group
}

/**
 * ACL position of a WhatsApp number, from the groups it is a participant of.
 * Tier is the highest scope among those groups; dusunIds collects the dusun(s)
 * of the number's dusun/anggota groups. Requires group membership to be synced
 * (see syncGroupsFromWhatsApp) — an unsynced number resolves to "none".
 */
export async function resolveRequester(fromJid: string): Promise<Requester> {
  const groups = await GroupModel.find({ participants: fromJid })
    .select("scope dusunId")
    .lean<Array<{ scope?: GroupScope | null; dusunId?: string | null }>>()

  if (groups.some((g) => g.scope === "pusat")) return { tier: "pusat" }

  const dusunGroups = groups.filter((g) => g.scope === "dusun")
  const anggotaGroups = groups.filter((g) => g.scope === "anggota")
  if (dusunGroups.length > 0) {
    return { tier: "dusun", dusunIds: uniqueDusunIds([...dusunGroups, ...anggotaGroups]) }
  }
  if (anggotaGroups.length > 0) {
    return { tier: "anggota", dusunIds: uniqueDusunIds(anggotaGroups) }
  }
  return { tier: "none" }
}

/** WA JIDs of every group the requester is allowed to read from. */
export async function allowedGroupJids(requester: Requester): Promise<string[]> {
  if (requester.tier === "none") return []
  if (requester.tier === "pusat") {
    const groups = await GroupModel.find({}).select("waJid").lean()
    return groups.map((g) => g.waJid)
  }
  if (requester.dusunIds.length === 0) return []
  const scopes = requester.tier === "dusun" ? ["dusun", "anggota"] : ["anggota"]
  const groups = await GroupModel.find({ scope: { $in: scopes }, dusunId: { $in: requester.dusunIds } })
    .select("waJid")
    .lean()
  return groups.map((g) => g.waJid)
}

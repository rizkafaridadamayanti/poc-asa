import mongoose, { Schema, type InferSchemaType } from "mongoose"

export const GROUP_SCOPES = ["pusat", "dusun", "anggota"] as const
export type GroupScope = (typeof GROUP_SCOPES)[number]

export const GROUP_SOURCES = ["manual", "auto"] as const
export type GroupSource = (typeof GROUP_SOURCES)[number]

const groupSchema = new Schema(
  {
    waJid: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    /** null = auto-registered, not yet reviewed by Pusat. Excluded from automated jobs until set. */
    scope: { type: String, enum: GROUP_SCOPES, default: null },
    dusunId: { type: String, default: null },
    /** "auto" = created from an inbound message or /api/groups/sync; "manual" = added via the form. */
    source: { type: String, enum: GROUP_SOURCES, default: "manual" },
    /** WA JIDs of current group members, refreshed on each /api/groups/sync. */
    participants: { type: [String], default: [] },
    /** JID of the WhatsApp group's creator, from Baileys group metadata. */
    ownerJid: { type: String, default: null },
    /** When the WhatsApp group itself was created (not when we registered it). */
    groupCreatedAt: { type: Date, default: null },
    /** WhatsApp group description ("about"), if set. */
    description: { type: String, default: "" },
  },
  { timestamps: true },
)

export type GroupDoc = Omit<InferSchemaType<typeof groupSchema>, "scope" | "dusunId"> & {
  _id: mongoose.Types.ObjectId
  scope: GroupScope | null
  dusunId: string | null
}

export const GroupModel =
  mongoose.models.Group ?? mongoose.model("Group", groupSchema)

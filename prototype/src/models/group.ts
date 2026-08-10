import mongoose, { Schema, type InferSchemaType } from "mongoose"

export const GROUP_SCOPES = ["pusat", "dusun", "anggota"] as const
export type GroupScope = (typeof GROUP_SCOPES)[number]

const groupSchema = new Schema(
  {
    waJid: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    scope: { type: String, enum: GROUP_SCOPES, required: true, default: "anggota" },
    dusunId: { type: String, default: "" },
  },
  { timestamps: true },
)

export type GroupDoc = InferSchemaType<typeof groupSchema> & {
  _id: mongoose.Types.ObjectId
}

export const GroupModel =
  mongoose.models.Group ?? mongoose.model("Group", groupSchema)

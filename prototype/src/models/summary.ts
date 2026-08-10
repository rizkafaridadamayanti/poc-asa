import mongoose, { Schema, type InferSchemaType } from "mongoose"

const summarySchema = new Schema(
  {
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    sourceGroupJid: { type: String, required: true },
    sourceScope: { type: String, enum: ["pusat", "dusun", "anggota"], default: "anggota" },
    bodyMd: { type: String, required: true },
    priorityScore: { type: Number, default: 0 },
    sourceMessageIds: { type: [String], default: [] },
    read: { type: Boolean, default: false },
    important: { type: Boolean, default: false },
    trash: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

summarySchema.index({ sourceGroupJid: 1, periodStart: -1 })
summarySchema.index({ trash: 1, trashedAt: 1 })

export type SummaryDoc = InferSchemaType<typeof summarySchema> & {
  _id: mongoose.Types.ObjectId
}

export const SummaryModel =
  mongoose.models.Summary ?? mongoose.model("Summary", summarySchema)

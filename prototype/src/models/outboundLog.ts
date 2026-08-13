import mongoose, { Schema, type InferSchemaType } from "mongoose"

const outboundLogSchema = new Schema(
  {
    toJid: { type: String, required: true },
    /** Free-form origin tag, e.g. "manual", "curated-info", "agenda-reminder", "spam-alert", "idea-ack", "weekly-stats", "qa-reply". */
    kind: { type: String, required: true, default: "manual" },
    text: { type: String, default: "" },
    ok: { type: Boolean, required: true },
    waMessageId: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
)

outboundLogSchema.index({ createdAt: -1 })
outboundLogSchema.index({ toJid: 1, createdAt: -1 })

export type OutboundLogDoc = InferSchemaType<typeof outboundLogSchema> & {
  _id: mongoose.Types.ObjectId
}

export const OutboundLogModel =
  mongoose.models.OutboundLog ?? mongoose.model("OutboundLog", outboundLogSchema)

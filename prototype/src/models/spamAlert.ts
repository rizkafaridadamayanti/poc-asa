import mongoose, { Schema, type InferSchemaType } from "mongoose"

const spamAlertSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    chatJid: { type: String, required: true },
    fromJid: { type: String, required: true },
    text: { type: String, default: "" },
    spamScore: { type: Number, required: true },
    reasons: { type: [String], default: [] },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true },
)

spamAlertSchema.index({ createdAt: -1 })

export type SpamAlertDoc = InferSchemaType<typeof spamAlertSchema> & {
  _id: mongoose.Types.ObjectId
}

export const SpamAlertModel =
  mongoose.models.SpamAlert ?? mongoose.model("SpamAlert", spamAlertSchema)

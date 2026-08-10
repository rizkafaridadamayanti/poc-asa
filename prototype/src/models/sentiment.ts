import mongoose, { Schema, type InferSchemaType } from "mongoose"

const sentimentSchema = new Schema(
  {
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    bodyMd: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

sentimentSchema.index({ periodStart: -1 })

export type SentimentDoc = InferSchemaType<typeof sentimentSchema> & {
  _id: mongoose.Types.ObjectId
}

export const SentimentModel =
  mongoose.models.Sentiment ?? mongoose.model("Sentiment", sentimentSchema)

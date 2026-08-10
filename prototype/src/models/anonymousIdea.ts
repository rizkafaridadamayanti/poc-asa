import mongoose, { Schema, type InferSchemaType } from "mongoose"

const anonymousIdeaSchema = new Schema(
  {
    text: { type: String, required: true },
    status: { type: String, enum: ["new", "reviewed"], default: "new" },
    // Deliberately no fromJid / any sender reference — this queue must stay anonymous.
  },
  { timestamps: true },
)

anonymousIdeaSchema.index({ status: 1, createdAt: -1 })

export type AnonymousIdeaDoc = InferSchemaType<typeof anonymousIdeaSchema> & {
  _id: mongoose.Types.ObjectId
}

export const AnonymousIdeaModel =
  mongoose.models.AnonymousIdea ?? mongoose.model("AnonymousIdea", anonymousIdeaSchema)

import mongoose, { Schema, type InferSchemaType } from "mongoose"

const messageSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    fromJid: { type: String, required: true, index: true },
    chatJid: { type: String, required: true },
    timestamp: { type: Number, required: true },
    type: { type: String, required: true, default: "text" },
    text: { type: String, default: "" },
    isGroup: { type: Boolean, required: true },
    flags: {
      spamScore: { type: Number, default: 0 },
      sentiment: { type: String, default: "" },
      isIdea: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

messageSchema.index({ chatJid: 1, timestamp: -1 })

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId
}

export const MessageModel =
  mongoose.models.Message ?? mongoose.model("Message", messageSchema)

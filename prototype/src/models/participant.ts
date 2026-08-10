import mongoose, { Schema, type InferSchemaType } from "mongoose"

const participantSchema = new Schema(
  {
    waJid: { type: String, required: true, unique: true },
    displayName: { type: String, default: "" },
    role: { type: String, default: "anggota" },
    dusun: { type: String, default: "" },
  },
  { timestamps: true },
)

export type ParticipantDoc = InferSchemaType<typeof participantSchema> & {
  _id: mongoose.Types.ObjectId
}

export const ParticipantModel =
  mongoose.models.Participant ??
  mongoose.model("Participant", participantSchema)

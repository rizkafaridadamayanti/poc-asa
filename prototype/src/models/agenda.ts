import mongoose, { Schema, type InferSchemaType } from "mongoose"

const reminderSchema = new Schema(
  {
    at: { type: Date, required: true },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
  },
  { _id: false },
)

const agendaSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueAt: { type: Date, required: true },
    remindAt: { type: [reminderSchema], default: [] },
    /** JIDs (group or individual) that receive the reminder text. */
    audience: { type: [String], required: true },
  },
  { timestamps: true },
)

agendaSchema.index({ dueAt: 1 })
agendaSchema.index({ "remindAt.at": 1, "remindAt.sent": 1 })

export type AgendaDoc = InferSchemaType<typeof agendaSchema> & {
  _id: mongoose.Types.ObjectId
}

export const AgendaModel =
  mongoose.models.Agenda ?? mongoose.model("Agenda", agendaSchema)

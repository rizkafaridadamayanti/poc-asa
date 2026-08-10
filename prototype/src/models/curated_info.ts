import mongoose, { Schema, type InferSchemaType } from "mongoose"

export const CURATED_INFO_TYPES = ["beasiswa", "loker", "inovasi"] as const
export type CuratedInfoType = (typeof CURATED_INFO_TYPES)[number]

export const CURATED_INFO_STATUSES = ["draft", "approved", "sent"] as const
export type CuratedInfoStatus = (typeof CURATED_INFO_STATUSES)[number]

const curatedInfoSchema = new Schema(
  {
    type: { type: String, enum: CURATED_INFO_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: CURATED_INFO_STATUSES, default: "draft" },
    /** Target group JIDs (@g.us) approved for fan-out. */
    targets: { type: [String], default: [] },
    approvedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
)

curatedInfoSchema.index({ status: 1, createdAt: -1 })

export type CuratedInfoDoc = InferSchemaType<typeof curatedInfoSchema> & {
  _id: mongoose.Types.ObjectId
}

export const CuratedInfoModel =
  mongoose.models.CuratedInfo ?? mongoose.model("CuratedInfo", curatedInfoSchema)

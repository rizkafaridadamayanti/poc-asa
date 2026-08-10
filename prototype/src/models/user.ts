import mongoose, { Schema, type InferSchemaType } from "mongoose"

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "pengurus_pusat" },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
}

export const UserModel =
  mongoose.models.User ?? mongoose.model("User", userSchema)

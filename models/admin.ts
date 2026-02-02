import mongoose, { Schema, Document, Model } from "mongoose"

export interface IAdmin extends Document {
  name: string
  email: string
  passwordHash: string
  role: string
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "admin" }
  },
  { timestamps: true }
)

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema)

export default Admin

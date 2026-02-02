import mongoose, { Schema, Document, Model } from "mongoose"

export interface IBankAccount extends Document {
  userId: mongoose.Types.ObjectId
  fullName: string
  aadhaar: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  pan?: string | null
  upi?: string | null
  isActive: boolean
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    fullName: { type: String, required: true },
    aadhaar: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    branch: { type: String, required: true },
    pan: { type: String, default: null },
    upi: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

const BankAccount: Model<IBankAccount> =
  mongoose.models.BankAccount ||
  mongoose.model<IBankAccount>("BankAccount", BankAccountSchema)

export default BankAccount

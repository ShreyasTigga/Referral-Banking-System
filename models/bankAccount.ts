import mongoose, { Schema, Document, models, model } from "mongoose";

export interface BankAccountDocument extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  aadhaar: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  pan?: string;
  upi?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<BankAccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true, // one active bank account per user
    },
    fullName: { type: String, required: true },
    aadhaar: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    branch: { type: String, required: true },
    pan: { type: String },
    upi: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Avoid recompiling model in dev
const BankAccount =
  (models.BankAccount as mongoose.Model<BankAccountDocument>) ||
  model<BankAccountDocument>("BankAccount", BankAccountSchema);

export default BankAccount;

import mongoose, { Schema, Document, Model } from "mongoose"

export interface IWithdrawalRequest extends Document {
  userId: mongoose.Types.ObjectId
  requestedAmount: number
  withdrawalAmount?: number
  status: "pending" | "approved" | "rejected"
  dateOfRequest: Date
  dateOfWithdrawal?: Date
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requestedAmount: {
      type: Number,
      required: true
    },
    withdrawalAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    dateOfRequest: {
      type: Date,
      default: Date.now
    },
    dateOfWithdrawal: {
      type: Date
    }
  },
  { timestamps: true }
)

const WithdrawalRequest: Model<IWithdrawalRequest> =
  mongoose.models.WithdrawalRequest ||
  mongoose.model<IWithdrawalRequest>(
    "WithdrawalRequest",
    WithdrawalRequestSchema
  )

export default WithdrawalRequest

import { ObjectId } from "mongodb";

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface WithdrawalRequest {
  _id?: ObjectId;
  userId: ObjectId;          // reference to users._id
  requestedAmount: number;
  dateOfRequest: Date;
  withdrawalAmount: number | null;   // final approved amount (set when admin processes)
  dateOfWithdrawal: Date | null;
  status: WithdrawalStatus;          // "pending" | "approved" | "rejected"
}

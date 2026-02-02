import { Queue } from "bullmq"
import { redis } from "./redis"

export interface ReferralJob {
  userId: string       // MongoDB _id as string
  referredBy?: string // MongoDB _id as string
}

export const referralQueue = new Queue<ReferralJob>(
  "referral-distribution",
  {
    connection: redis
  }
)

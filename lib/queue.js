import { Queue } from "bullmq"
import { redis } from "./redis"

export const referralQueue = new Queue("referral-distribution", {
  connection: redis
})

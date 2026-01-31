import { Worker } from "bullmq"
import { redis } from "./lib/redis"
import dbConnect from "./lib/mongodb"
import User from "./models/User"
import Wallet from "./models/Wallet"

dbConnect()

const worker = new Worker(
  "referral-distribution",
  async job => {
    const { userId, referredBy } = job.data

    console.log("Processing referral for:", userId)

    // Credit new user
    await Wallet.updateOne(
      { userId },
      { $inc: { balance: 100 } },
      { upsert: true }
    )

    // Credit referrer
    if (referredBy) {
      await Wallet.updateOne(
        { userId: referredBy },
        { $inc: { balance: 50 } },
        { upsert: true }
      )
    }

    console.log("Distribution completed for:", userId)
  },
  {
    connection: redis
  }
)

console.log("Worker running...")

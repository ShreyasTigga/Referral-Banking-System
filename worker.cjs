require("dotenv").config({ path: ".env.local" })

const { Worker, QueueEvents } = require("bullmq")
const { redis } = require("./lib/redis.js")
const dbConnect = require("./lib/mongodb.js")
const User = require("./models/User.js")

// Multi-level reward config
const REWARD_PER_LEVEL = [100, 50, 25] // Level 1, 2, 3

async function distributeMultiLevel(referredBy) {
  let currentRef = referredBy
  let level = 0

  while (currentRef && level < REWARD_PER_LEVEL.length) {
    const reward = REWARD_PER_LEVEL[level]

    console.log(
      `💸 Rewarding level ${level + 1} user ${currentRef} with ₹${reward}`
    )

    // Credit current ancestor
    const parent = await User.findByIdAndUpdate(
      currentRef,
      { $inc: { currentBalance: reward } },
      { new: true }
    )

    if (!parent || !parent.referredBy) break

    // Move up the tree
    currentRef = parent.referredBy.toString()
    level++
  }
}

async function startWorker() {
  await dbConnect()

  // Optional: Listen to queue lifecycle events
  const queueEvents = new QueueEvents("referral-distribution", {
    connection: redis
  })

  queueEvents.on("completed", ({ jobId }) => {
    console.log(`✅ Job ${jobId} completed`)
  })

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ Job ${jobId} failed:`, failedReason)
  })

  new Worker(
    "referral-distribution",
    async (job) => {
      const { userId, referredBy } = job.data

      console.log("🚀 Processing referral job for user:", userId)

      if (!userId) {
        throw new Error("Missing userId in job data")
      }

      if (!referredBy) {
        console.log("ℹ️ No referrer — skipping reward distribution")
        return
      }

      await distributeMultiLevel(referredBy)

      console.log("🎉 Distribution completed for:", userId)
    },
    {
      connection: redis,
      concurrency: 5, // process up to 5 jobs in parallel
      settings: {
        backoffStrategy: (attemptsMade) => {
          return Math.min(attemptsMade * 1000, 10000) // max 10s
        }
      }
    }
  )

  console.log("🟢 Worker running and listening for jobs...")
}

startWorker().catch((err) => {
  console.error("💥 Worker failed to start:", err)
  process.exit(1)
})

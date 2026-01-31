import { referralQueue } from "@/lib/queue"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(req) {
  const { userId, referredBy } = await req.json()

  await dbConnect()

  const user = await User.create({ userId, referredBy })

  // Add background job
  await referralQueue.add("distribute", {
    userId,
    referredBy
  })

  return Response.json({
    success: true,
    message: "Referral created. Reward processing in background."
  })
}

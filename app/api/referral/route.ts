import { NextResponse } from "next/server"
import { referralQueue } from "@/lib/queue"
import dbConnect from "@/lib/mongodb"
import User from "@/models/user"
import mongoose from "mongoose"

interface ReferralRequestBody {
  name: string
  email: string
  passwordHash: string
  referredBy?: string // userId of referrer
}

export async function POST(req: Request) {
  try {
    const body: ReferralRequestBody = await req.json()
    const { name, email, passwordHash, referredBy } = body

    if (!name || !email || !passwordHash) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    await dbConnect()

    let referrerId: mongoose.Types.ObjectId | null = null

    if (referredBy) {
      const refUser = await User.findById(referredBy)
      if (!refUser) {
        return NextResponse.json(
          { success: false, message: "Invalid referrer ID" },
          { status: 400 }
        )
      }
      referrerId = refUser._id
    }

    const user = await User.create({
      name,
      email,
      passwordHash,
      referredBy: referrerId
    })

    // Enqueue background job
    await referralQueue.add("distribute", {
      userId: user._id.toString(),
      referredBy: referrerId?.toString()
    })

    return NextResponse.json({
      success: true,
      message: "User created. Referral rewards processing in background.",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        referredBy: user.referredBy
      }
    })
  } catch (err) {
    console.error("Referral API error:", err)

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

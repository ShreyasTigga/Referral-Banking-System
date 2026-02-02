import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/user"
import mongoose from "mongoose"

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ _id: string }> }
) {
  try {
    // ✅ Next.js 16: params is a Promise — MUST await
    const { _id: userId } = await ctx.params

    console.log("🔍 userId from params._id:", userId)

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format", userId },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    // Current user
    const user = await User.findById(userId).lean()
    if (!user) {
      return NextResponse.json(
        { error: "User not found", userId },
        { status: 404 }
      )
    }

    // Immediate children (direct referrals)
    const childrenDocs = await User.find({
      referredBy: user._id
    })
      .select("name email")
      .lean()

    const children = childrenDocs.map((child) => ({
      id: child._id.toString(),
      name: child.name,
      email: child.email
    }))

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      currentBalance: user.currentBalance ?? 0,
      referredBy: user.referredBy
        ? user.referredBy.toString()
        : null,
      children
    })
  } catch (err: any) {
    console.error("💥 ERROR in /api/users/[_id]:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

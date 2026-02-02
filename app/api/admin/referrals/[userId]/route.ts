import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { verifyAdminToken } from "@/lib/adminAuth"
import User from "@/models/user"
import mongoose from "mongoose"

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // --- Auth ---
    const token = req.cookies.get("admin_session")?.value
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No admin session" },
        { status: 401 }
      )
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      )
    }

    // --- Params ---
    const { userId } = params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format", userId },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    // Current user
    const user = await User.findById(userId).lean()
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // --- Ancestors (walk up referral chain) ---
    const ancestors: Array<{
      id: string
      name: string
      email: string
    }> = []

    let currentRef = user.referredBy as mongoose.Types.ObjectId | null

    while (currentRef) {
      const parent = await User.findById(currentRef).lean()
      if (!parent) break

      ancestors.push({
        id: parent._id.toString(),
        name: parent.name,
        email: parent.email
      })

      currentRef = parent.referredBy as mongoose.Types.ObjectId | null
    }

    // --- Direct children (users referred by this user) ---
    const childrenDocs = await User.find({
      referredBy: user._id
    })
      .select("name email")
      .lean()

    const children = childrenDocs.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      email: c.email
    }))

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      },
      ancestors,
      children
    })
  } catch (err: any) {
    console.error("ERROR in GET /api/admin/referral/[userId]:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

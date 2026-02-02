import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import { verifyAdminToken } from "@/lib/adminAuth"
import User from "@/models/user"

export async function GET(req: NextRequest) {
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

    // --- DB ---
    await dbConnect()

    // Fetch users (latest first)
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select("name email referredBy currentBalance createdAt")
      .lean()

    const result = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      referredBy: u.referredBy ? u.referredBy.toString() : null,
      currentBalance: u.currentBalance ?? 0,
      createdAt: u.createdAt
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("ERROR in GET /api/admin/users:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/user"

export async function GET() {
  try {
    // --- DB ---
    await dbConnect()

    const users = await User.find({})
      .select("name email currentBalance referredBy")
      .lean()

    const result = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      currentBalance: u.currentBalance ?? 0,
      referredBy: u.referredBy ? u.referredBy.toString() : null
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("ERROR /api/users/all:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

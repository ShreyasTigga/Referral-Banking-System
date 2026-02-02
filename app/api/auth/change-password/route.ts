import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import User from "@/models/user"
import mongoose from "mongoose"

interface ChangePasswordBody {
  userId: string
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ChangePasswordBody = await req.json()
    const { userId, oldPassword, newPassword, confirmPassword } = body

    // --- Validation ---
    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirm password do not match" },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // --- Auth ---
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      )
    }

    // --- Update ---
    const newHash = await bcrypt.hash(newPassword, 10)

    user.passwordHash = newHash
    await user.save()

    return NextResponse.json({
      message: "Password changed successfully"
    })
  } catch (err: any) {
    console.error("Change Password Error:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import User from "@/models/user"

interface LoginBody {
  email: string
  password: string
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginBody = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // --- Auth ---
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // --- Response ---
    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        currentBalance: user.currentBalance ?? 0,
        referredBy: user.referredBy
          ? user.referredBy.toString()
          : null
      }
    })
  } catch (err: any) {
    console.error("ERROR in POST /api/auth/login:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import User from "@/models/user"
import { referralQueue } from "@/lib/queue"
import mongoose from "mongoose"

interface RegisterBody {
  name: string
  email: string
  password: string
  referredBy?: string
}

export async function POST(req: Request) {
  try {
    const body: RegisterBody = await req.json()
    const { name, email, password, referredBy } = body

    // --- Validation ---
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    if (referredBy && !mongoose.Types.ObjectId.isValid(referredBy)) {
      return NextResponse.json(
        { error: "Invalid referredBy ID" },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    // Check existing user
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    // Validate referrer
    let parentId: mongoose.Types.ObjectId | null = null
    if (referredBy) {
      const parent = await User.findById(referredBy)
      if (!parent) {
        return NextResponse.json(
          { error: "Invalid referredBy ID" },
          { status: 400 }
        )
      }
      parentId = parent._id
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create new user
    const user = await User.create({
      name,
      email,
      passwordHash,
      referredBy: parentId,
      currentBalance: 0
    })

    // --- Enqueue background job ---
    if (parentId) {
      await referralQueue.add("distribute", {
        userId: user._id.toString(),
        referredBy: parentId.toString()
      })
    }

    return NextResponse.json({
      message: "User registered successfully",
      userId: user._id.toString()
    })
  } catch (error: any) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: error.message ?? "Internal Server Error" },
      { status: 500 }
    )
  }
}

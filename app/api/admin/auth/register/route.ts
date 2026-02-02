import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import Admin from "@/models/admin"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      )
    }

    // Connect before using models
    await dbConnect()

    // Check if admin already exists
    const existing = await Admin.findOne({ email })
    if (existing) {
      return NextResponse.json(
        { error: "Admin with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      passwordHash,
      role: "admin"
    })

    return NextResponse.json(
      {
        message: "Admin registered successfully",
        adminId: admin._id.toString()
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("Admin Register Error:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    )
  }
}

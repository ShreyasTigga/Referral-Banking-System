// app/api/admin/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const admins = db.collection("admins");

    // Check if admin already exists
    const existing = await admins.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Admin with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new admin
    const result = await admins.insertOne({
      name,
      email,
      passwordHash,
      role: "admin",
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Admin registered successfully",
        adminId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Admin Register Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

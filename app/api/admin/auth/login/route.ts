import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signAdminToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // ✅ Create JWT token for admin
    const token = await signAdminToken({
      adminId: admin._id.toString(),
      email: admin.email,
    });

    // ✅ Create response and attach HttpOnly cookie
    const res = NextResponse.json({
      message: "Admin login successful",
      adminId: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });

    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
    });

    return res;
  } catch (err: any) {
    console.error("Admin Login Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

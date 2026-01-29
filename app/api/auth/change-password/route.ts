import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const { userId, oldPassword, newPassword, confirmPassword } =
      await req.json();

    // Basic validation
    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirm password do not match" },
        { status: 400 }
      );
    }

    if (typeof userId !== "string" || userId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const users = db.collection("users");

    const userObjectId = new ObjectId(userId);

    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Compare old password with stored hash
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { _id: userObjectId },
      { $set: { passwordHash: newHash } }
    );

    return NextResponse.json({
      message: "Password changed successfully",
    });
  } catch (err: any) {
    console.error("Change Password Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

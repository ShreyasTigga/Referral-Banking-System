import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const users = db.collection("users");

    const docs = await users
      .find({})
      .project({ name: 1, email: 1, currentBalance: 1, referredBy: 1 })
      .toArray();

    const result = docs.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      currentBalance: u.currentBalance ?? 0,
      referredBy: u.referredBy ? u.referredBy.toString() : null,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("ERROR /api/users/all:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

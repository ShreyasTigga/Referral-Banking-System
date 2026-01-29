import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, ctx: any) {
  // ✅ Next.js 16: params is a Promise, so await it
  const params = await ctx.params;
  const userId = params._id; // because your folder is named [_id]

  console.log("🔍 userId from params._id:", userId);

  if (!userId || userId.length !== 24) {
    return NextResponse.json(
      { error: "Invalid user ID format", userId },
      { status: 400 }
    );
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(userId);
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid ObjectId conversion", userId },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const users = db.collection("users");

    const user = await users.findOne({ _id: objectId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", userId },
        { status: 404 }
      );
    }

    // Get immediate children
    const childrenDocs = await users
      .find({ referredBy: user._id })
      .project({ name: 1, email: 1 })
      .toArray();

    const children = childrenDocs.map((child: any) => ({
      id: child._id.toString(),
      name: child.name,
      email: child.email,
    }));

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      currentBalance: user.currentBalance ?? 0,
      referredBy: user.referredBy ? user.referredBy.toString() : null,
      children,
    });
  } catch (err: any) {
    console.error("💥 ERROR in /api/users/[_id]:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

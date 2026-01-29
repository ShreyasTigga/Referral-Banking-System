import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(req: NextRequest, ctx: any) {
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No admin session" },
        { status: 401 }
      );
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }

    const params = await ctx.params;
    const userId = params.userId as string;

    if (!userId || userId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid userId format", userId },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const users = db.collection("users");
    const userObjectId = new ObjectId(userId);

    // Current user
    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Ancestors (walk up via referredBy)
    const ancestors: any[] = [];
    let currentRef = user.referredBy || null;

    while (currentRef) {
      const parent = await users.findOne({ _id: currentRef });
      if (!parent) break;
      ancestors.push({
        id: parent._id.toString(),
        name: parent.name,
        email: parent.email,
      });
      currentRef = parent.referredBy || null;
    }

    // Direct children (users referred by this user)
    const childrenDocs = await users
      .find({ referredBy: userObjectId })
      .toArray();

    const children = childrenDocs.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      email: c.email,
    }));

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      ancestors,
      children,
    });
  } catch (err: any) {
    console.error("ERROR in GET /api/admin/referrals/[userId]:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

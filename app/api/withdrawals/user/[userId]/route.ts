import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, ctx: any) {
  const params = await ctx.params;
  const userId = params.userId as string | undefined;

  if (!userId || userId.length !== 24) {
    return NextResponse.json(
      { error: "Invalid userId", userId },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const withdrawals = db.collection("withdrawal_requests");

    const userObjectId = new ObjectId(userId);

    const docs = await withdrawals
      .find({ userId: userObjectId })
      .sort({ dateOfRequest: -1 })
      .toArray();

    const result = docs.map((w: any) => ({
      id: w._id.toString(),
      requestedAmount: w.requestedAmount,
      dateOfRequest: w.dateOfRequest,
      withdrawalAmount: w.withdrawalAmount,
      dateOfWithdrawal: w.dateOfWithdrawal,
      status: w.status,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("ERROR in GET /api/withdrawals/user/[userId]:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
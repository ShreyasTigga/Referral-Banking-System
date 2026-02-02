import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import WithdrawalRequest from "@/models/withdrawalRequest"
import mongoose from "mongoose"

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    // ✅ Next.js 16: params is async
    const { userId } = await ctx.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId", userId },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    const docs = await WithdrawalRequest.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
      .sort({ dateOfRequest: -1 })
      .lean()

    const result = docs.map((w) => ({
      id: w._id.toString(),
      requestedAmount: w.requestedAmount,
      dateOfRequest: w.dateOfRequest,
      withdrawalAmount: w.withdrawalAmount ?? 0,
      dateOfWithdrawal: w.dateOfWithdrawal ?? null,
      status: w.status
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error(
      "ERROR in GET /api/withdrawals/user/[userId]:",
      err
    )
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

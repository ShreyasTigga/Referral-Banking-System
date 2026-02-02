import { verifyAdminToken } from "@/lib/adminAuth"
import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import WithdrawalRequest from "@/models/withdrawalRequest"
import User from "@/models/user"
import mongoose from "mongoose"

/**
 * GET /api/admin/withdrawals
 * Returns withdrawal requests with user info
 */
export async function GET(req: NextRequest) {
  try {
    // --- Auth ---
    const token = req.cookies.get("admin_session")?.value
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No admin session" },
        { status: 401 }
      )
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      )
    }

    // --- Query ---
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get("status") || "pending"

    const query: any = {}
    if (statusParam !== "all") {
      query.status = statusParam
    }

    // --- DB ---
    await dbConnect()

    const docs = await WithdrawalRequest.find(query)
      .sort({ dateOfRequest: -1 })
      .populate("userId", "name email")
      .lean()

    const result = docs.map((w) => ({
      id: w._id.toString(),
      userId: (w.userId as any)?._id?.toString(),
      userName: (w.userId as any)?.name ?? "Unknown",
      userEmail: (w.userId as any)?.email ?? "Unknown",
      requestedAmount: w.requestedAmount,
      withdrawalAmount: w.withdrawalAmount ?? 0,
      dateOfRequest: w.dateOfRequest,
      dateOfWithdrawal: w.dateOfWithdrawal,
      status: w.status
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("ERROR in GET /api/admin/withdrawals:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/withdrawals
 * Body: { requestId: string, action: "approve" | "reject" }
 */
export async function POST(req: NextRequest) {
  try {
    // --- Auth ---
    const token = req.cookies.get("admin_session")?.value
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No admin session" },
        { status: 401 }
      )
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      )
    }

    const { requestId, action } = await req.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "requestId and action are required" },
        { status: 400 }
      )
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { error: "Invalid requestId format", requestId },
        { status: 400 }
      )
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    const requestDoc = await WithdrawalRequest.findById(requestId)

    if (!requestDoc) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      )
    }

    if (requestDoc.status !== "pending") {
      return NextResponse.json(
        { error: `Request is already ${requestDoc.status}` },
        { status: 400 }
      )
    }

    const user = await User.findById(requestDoc.userId)

    if (!user) {
      return NextResponse.json(
        { error: "User not found for this withdrawal request" },
        { status: 404 }
      )
    }

    const currentBalance = user.currentBalance ?? 0
    const requestedAmount = requestDoc.requestedAmount

    if (action === "approve") {
      if (currentBalance < requestedAmount) {
        return NextResponse.json(
          {
            error: "Insufficient balance",
            currentBalance,
            requestedAmount
          },
          { status: 400 }
        )
      }

      const now = new Date()

      // Atomic updates
      await User.findByIdAndUpdate(user._id, {
        $inc: { currentBalance: -requestedAmount }
      })

      await WithdrawalRequest.findByIdAndUpdate(requestDoc._id, {
        $set: {
          status: "approved",
          withdrawalAmount: requestedAmount,
          dateOfWithdrawal: now
        }
      })

      return NextResponse.json({
        message: "Withdrawal request approved",
        requestId,
        newBalance: currentBalance - requestedAmount
      })
    } else {
      const now = new Date()

      await WithdrawalRequest.findByIdAndUpdate(requestDoc._id, {
        $set: {
          status: "rejected",
          withdrawalAmount: 0,
          dateOfWithdrawal: now
        }
      })

      return NextResponse.json({
        message: "Withdrawal request rejected",
        requestId
      })
    }
  } catch (err: any) {
    console.error("ERROR in POST /api/admin/withdrawals:", err)
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    )
  }
}

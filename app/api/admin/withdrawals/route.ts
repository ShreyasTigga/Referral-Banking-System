import { verifyAdminToken } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * GET /api/admin/withdrawals
 * Returns all pending withdrawal requests with basic user info.
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ Check admin_session cookie
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

    const { db } = await connectToDatabase();
    const withdrawals = db.collection("withdrawal_requests");
    const users = db.collection("users");

    // 🔍 Read status filter from query
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "pending";

    let query: any = {};
    if (statusParam !== "all") {
      query.status = statusParam;
    }

    const docs = await withdrawals
      .find(query)
      .sort({ dateOfRequest: -1 })
      .toArray();

    const result = [];
    for (const w of docs) {
      const user = await users.findOne(
        { _id: w.userId },
        { projection: { name: 1, email: 1 } }
      );

      result.push({
        id: w._id.toString(),
        userId: w.userId.toString(),
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "Unknown",
        requestedAmount: w.requestedAmount,
        dateOfRequest: w.dateOfRequest,
        withdrawalAmount: w.withdrawalAmount,
        dateOfWithdrawal: w.dateOfWithdrawal,
        status: w.status,
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("ERROR in GET /api/admin/withdrawals:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/withdrawals
 * Body: { requestId: string, action: "approve" | "reject" }
 *
 * - approve: deducts from user's balance, marks request as approved
 * - reject: marks request as rejected
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin_session cookie
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

    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "requestId and action are required" },
        { status: 400 }
      );
    }

    if (typeof requestId !== "string" || requestId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid requestId format", requestId },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const withdrawals = db.collection("withdrawal_requests");
    const users = db.collection("users");

    const requestObjectId = new ObjectId(requestId);

    const requestDoc = await withdrawals.findOne({ _id: requestObjectId });

    if (!requestDoc) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    if (requestDoc.status !== "pending") {
      return NextResponse.json(
        { error: `Request is already ${requestDoc.status}` },
        { status: 400 }
      );
    }

    const userId = requestDoc.userId;
    const requestedAmount = requestDoc.requestedAmount;

    const user = await users.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found for this withdrawal request" },
        { status: 404 }
      );
    }

    const currentBalance = user.currentBalance ?? 0;

    if (action === "approve") {
      if (currentBalance < requestedAmount) {
        return NextResponse.json(
          {
            error:
              "User does not have sufficient balance to approve this withdrawal",
            currentBalance,
            requestedAmount,
          },
          { status: 400 }
        );
      }

      const now = new Date();

      await users.updateOne(
        { _id: userId },
        { $inc: { currentBalance: -requestedAmount } }
      );

      await withdrawals.updateOne(
        { _id: requestObjectId },
        {
          $set: {
            status: "approved",
            withdrawalAmount: requestedAmount,
            dateOfWithdrawal: now,
          },
        }
      );

      return NextResponse.json({
        message: "Withdrawal request approved",
        requestId,
        newBalance: currentBalance - requestedAmount,
      });
    } else {
      const now = new Date();

      await withdrawals.updateOne(
        { _id: requestObjectId },
        {
          $set: {
            status: "rejected",
            withdrawalAmount: 0,
            dateOfWithdrawal: now,
          },
        }
      );

      return NextResponse.json({
        message: "Withdrawal request rejected",
        requestId,
      });
    }
  } catch (err: any) {
    console.error("ERROR in POST /api/admin/withdrawals:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

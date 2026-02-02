import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    // 1. Read JSON body
    const { userId, amount } = await req.json();

    // 2. Basic validation
    if (!userId || !amount) {
      return NextResponse.json(
        { error: "userId and amount are required" },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (typeof userId !== "string" || userId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid userId format", userId },
        { status: 400 }
      );
    }

    // 3. Connect to DB
    const { db } = await dbConnect();
    const users = db.collection("users");
    const withdrawals = db.collection("withdrawal_requests");

    const userObjectId = new ObjectId(userId);

    // 4. Check that user exists
    const user = await users.findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 5. Optional: check balance before allowing the request
    const currentBalance = user.currentBalance ?? 0;
    if (currentBalance < numericAmount) {
      return NextResponse.json(
        {
          error: "Insufficient balance for this withdrawal request",
          currentBalance,
        },
        { status: 400 }
      );
    }

    // 6. Build request document
    const now = new Date();

    const newRequest = {
      userId: userObjectId,          // reference to users._id
      requestedAmount: numericAmount,
      dateOfRequest: now,
      withdrawalAmount: null,        // will be set on approval
      dateOfWithdrawal: null,        // will be set on approval
      status: "pending" as const,    // "pending" | "approved" | "rejected"
    };

    // 7. Insert into withdrawal_requests collection
    const result = await withdrawals.insertOne(newRequest);

    // 8. Respond to client
    return NextResponse.json({
      message: "Withdrawal request created successfully",
      requestId: result.insertedId.toString(),
      status: "pending",
    });
  } catch (err: any) {
    console.error("ERROR in POST /api/withdrawals/request:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

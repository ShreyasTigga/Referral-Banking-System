// app/api/bank/user/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { db } = await connectToDatabase();

    const { userId } = await ctx.params;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    const userObjectId = new ObjectId(userId);

    const bankAccount = await db
      .collection("bankaccounts")
      .findOne({ userId: userObjectId });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "No bank account found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: bankAccount._id.toString(),
        userId: bankAccount.userId.toString(),
        fullName: bankAccount.fullName,
        aadhaar: bankAccount.aadhaar,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        ifsc: bankAccount.ifsc,
        branch: bankAccount.branch,
        pan: bankAccount.pan ?? null,
        upi: bankAccount.upi ?? null,
        isActive: bankAccount.isActive,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching bank account:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

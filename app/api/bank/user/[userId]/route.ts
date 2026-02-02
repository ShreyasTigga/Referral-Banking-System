import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import BankAccount from "@/models/bankAccount"
import mongoose from "mongoose"

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      )
    }

    // --- DB ---
    await dbConnect()

    const bankAccount = await BankAccount.findOne({
      userId: new mongoose.Types.ObjectId(userId)
    }).lean()

    if (!bankAccount) {
      return NextResponse.json(
        { error: "No bank account found for this user" },
        { status: 404 }
      )
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
        isActive: bankAccount.isActive
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("Error fetching bank account:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

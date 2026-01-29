// app/api/bank/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    const body = await req.json();
    const {
      userId,
      fullName,
      aadhaar,
      bankName,
      accountNumber,
      ifsc,
      branch,
      pan,
      upi,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    const userObjectId = new ObjectId(userId);

    // ✅ Ensure user exists in "users" collection
    const user = await db.collection("users").findOne({ _id: userObjectId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (
      !fullName ||
      !aadhaar ||
      !bankName ||
      !accountNumber ||
      !ifsc ||
      !branch
    ) {
      return NextResponse.json(
        { error: "Missing required bank details." },
        { status: 400 }
      );
    }

    const now = new Date();

    // ✅ Upsert into "bankaccounts" collection
    const result = await db.collection("bankaccounts").findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          userId: userObjectId,
          fullName,
          aadhaar,
          bankName,
          accountNumber,
          ifsc,
          branch,
          pan: pan ?? null,
          upi: upi ?? null,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const bankAccount = result.value;

    // In rare case result.value is null (very old driver), re-fetch:
    const finalDoc =
      bankAccount ??
      (await db
        .collection("bankaccounts")
        .findOne({ userId: userObjectId }));

    if (!finalDoc) {
      return NextResponse.json(
        { error: "Failed to save bank account" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Bank account saved successfully",
        bankAccount: {
          id: finalDoc._id.toString(),
          userId: finalDoc.userId.toString(),
          fullName: finalDoc.fullName,
          aadhaar: finalDoc.aadhaar,
          bankName: finalDoc.bankName,
          accountNumber: finalDoc.accountNumber,
          ifsc: finalDoc.ifsc,
          branch: finalDoc.branch,
          pan: finalDoc.pan ?? null,
          upi: finalDoc.upi ?? null,
          isActive: finalDoc.isActive,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error saving bank account:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

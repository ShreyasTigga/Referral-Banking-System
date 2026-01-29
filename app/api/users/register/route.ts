import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// Multi-level decreasing reward config
const REWARD_PER_LEVEL = [100, 50, 25]; // Level 1, 2, 3

export async function POST(req: Request) {
  try {
    const { name, email, password, referredBy } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const users = db.collection("users");

    // Check existing user
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Validate referredBy and get parentId (ObjectId or null)
    let parentId: ObjectId | null = null;

    if (referredBy) {
      const parent = await users.findOne({ _id: new ObjectId(referredBy) });

      if (!parent) {
        return NextResponse.json(
          { error: "Invalid referredBy ID" },
          { status: 400 }
        );
      }

      parentId = parent._id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      name,
      email,
      passwordHash,
      referredBy: parentId, // can be null or ObjectId
      currentBalance: 0,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);
    const newUserId = result.insertedId;

    // ✅ Directly distribute multi-level referral rewards (inline, no jobs)
    if (parentId) {
      await distributeRewardMultiLevel(db, parentId);
    }

    return NextResponse.json({
      message: "User registered successfully",
      userId: newUserId,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Distribute rewards up the ancestor chain with decreasing amount:
 * Level 1: REWARD_PER_LEVEL[0]
 * Level 2: REWARD_PER_LEVEL[1]
 * Level 3: REWARD_PER_LEVEL[2]
 */
async function distributeRewardMultiLevel(db: any, startingAncestorId: ObjectId) {
  const users = db.collection("users");

  let current = await users.findOne({ _id: startingAncestorId });
  let level = 0;

  // Walk up the tree, rewarding each ancestor up to REWARD_PER_LEVEL.length
  while (current && level < REWARD_PER_LEVEL.length) {
    const reward = REWARD_PER_LEVEL[level];

    console.log(
      `Rewarding level ${level + 1} user ${current._id.toString()} with ₹${reward}`
    );

    // Reward the current ancestor
    await users.updateOne(
      { _id: current._id },
      { $inc: { currentBalance: reward } }
    );

    // Move to parent for next level
    if (!current.referredBy) {
      break; // reached root
    }

    current = await users.findOne({ _id: current.referredBy });
    level += 1;
  }
}

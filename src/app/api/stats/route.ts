import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const stats = await db.collection("userStats").findOne({ userId: "1" });

  if (!stats) {
    await db
      .collection("userStats")
      .insertOne({ userId: "1", totalScore: 0 });
    return NextResponse.json({ totalScore: 0 });
  }

  return NextResponse.json({ totalScore: stats.totalScore });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { addPoints } = await request.json();
  if (typeof addPoints !== "number") {
    return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db
    .collection("userStats")
    .findOneAndUpdate(
      { userId: "1" },
      { $inc: { totalScore: addPoints } },
      { upsert: true, returnDocument: "after" }
    );

  return NextResponse.json({ totalScore: result?.totalScore ?? addPoints });
}

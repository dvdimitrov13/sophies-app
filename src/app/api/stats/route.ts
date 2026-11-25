import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isDateKey, nextStreak } from "@/lib/streak";
import { isDirectionPref, type UserStats } from "@/lib/types";

const USER_ID = "1";

function toStats(doc: Record<string, unknown> | null): UserStats {
  return {
    totalScore: (doc?.totalScore as number) ?? 0,
    currentStreak: (doc?.currentStreak as number) ?? 0,
    longestStreak: (doc?.longestStreak as number) ?? 0,
    lastStudyDate: (doc?.lastStudyDate as string) ?? null,
    directionPref: isDirectionPref(doc?.directionPref) ? doc.directionPref : "mixed",
  };
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const stats = await db.collection("userStats").findOne({ userId: USER_ID });

  if (!stats) {
    await db
      .collection("userStats")
      .insertOne({ userId: USER_ID, totalScore: 0 });
  }

  return NextResponse.json(toStats(stats));
}

/**
 * Body: { addPoints?: number, studiedOn?: "YYYY-MM-DD", directionPref?: DirectionPref }
 * `addPoints` adds to the score; `studiedOn` records a day of study for the
 * streak (sent with the learner's local date); `directionPref` saves which way
 * cards are asked.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { addPoints, studiedOn, directionPref } = await request.json();
  if (addPoints !== undefined && typeof addPoints !== "number") {
    return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  }
  if (studiedOn !== undefined && !isDateKey(studiedOn)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (directionPref !== undefined && !isDirectionPref(directionPref)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection("userStats");

  if (typeof addPoints === "number" && addPoints !== 0) {
    await collection.updateOne(
      { userId: USER_ID },
      { $inc: { totalScore: addPoints } },
      { upsert: true }
    );
  }

  if (directionPref) {
    await collection.updateOne(
      { userId: USER_ID },
      { $set: { directionPref } },
      { upsert: true }
    );
  }

  if (studiedOn) {
    const before = toStats(await collection.findOne({ userId: USER_ID }));
    if (before.lastStudyDate !== studiedOn) {
      const currentStreak = nextStreak(
        before.currentStreak,
        before.lastStudyDate,
        studiedOn
      );
      await collection.updateOne(
        { userId: USER_ID },
        {
          $set: {
            currentStreak,
            longestStreak: Math.max(before.longestStreak, currentStreak),
            lastStudyDate: studiedOn,
          },
        },
        { upsert: true }
      );
    }
  }

  const after = await collection.findOne({ userId: USER_ID });
  return NextResponse.json(toStats(after));
}

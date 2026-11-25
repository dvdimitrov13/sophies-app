import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Flashcard } from "@/lib/types";

const MAX_CARDS = 100;
// The database is Azure Cosmos DB, which rejects bursts of writes with
// "TooManyRequests" (code 16500). Insert in small batches and retry.
const BATCH_SIZE = 10;
const MAX_RETRIES = 6;

function isCard(value: unknown): value is Flashcard {
  const c = value as Flashcard;
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.englishWord === "string" &&
    typeof c.bulgarianWord === "string" &&
    typeof c.bulgarianSentence === "string" &&
    typeof c.englishSentence === "string" &&
    typeof c.topic === "string" &&
    typeof c.nextReviewDate === "number"
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** How long Cosmos asked us to wait, or null if this isn't a rate-limit error. */
function retryDelay(error: unknown, attempt: number): number | null {
  const e = error as { code?: number; message?: string };
  if (e?.code !== 16500 && !/TooManyRequests|429/.test(e?.message ?? "")) return null;
  const asked = Number(/RetryAfterMs=(\d+)/.exec(e.message ?? "")?.[1] ?? 0);
  return Math.max(asked, 250 * 2 ** attempt);
}

/** Number of documents an ordered insertMany wrote before it failed. */
function insertedBeforeError(error: unknown): number {
  const e = error as { result?: { insertedCount?: number }; insertedCount?: number };
  return e?.result?.insertedCount ?? e?.insertedCount ?? 0;
}

// POST /api/cards/import — add several cards, skipping words already in the deck
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cards } = await request.json();
  if (!Array.isArray(cards) || cards.length > MAX_CARDS || !cards.every(isCard)) {
    return NextResponse.json({ error: "Invalid cards" }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection("cards");

  const words = cards.map((c) => c.englishWord.toLowerCase().trim());
  const existing = await collection
    .find({ englishWord: { $in: words } }, { projection: { englishWord: 1 } })
    .toArray();
  const taken = new Set(existing.map((d) => d.englishWord as string));

  const toAdd: Flashcard[] = [];
  for (const card of cards) {
    const word = card.englishWord.toLowerCase().trim();
    if (taken.has(word)) continue;
    taken.add(word);
    toAdd.push({ ...card, englishWord: word });
  }

  const added: Flashcard[] = [];
  let remaining = toAdd;
  let attempt = 0;
  while (remaining.length > 0) {
    const batch = remaining.slice(0, BATCH_SIZE);
    try {
      // insertMany adds _id to the objects it is given, so give it copies.
      await collection.insertMany(batch.map((c) => ({ ...c })));
      added.push(...batch);
      remaining = remaining.slice(batch.length);
      attempt = 0;
    } catch (error) {
      const done = insertedBeforeError(error);
      added.push(...batch.slice(0, done));
      remaining = remaining.slice(done);
      const delay = retryDelay(error, attempt);
      if (delay === null || attempt >= MAX_RETRIES) {
        console.error("Import stopped:", error);
        return NextResponse.json(
          {
            added,
            error: `Added ${added.length} of ${toAdd.length} words, then the database refused more. Try again in a minute to add the rest.`,
          },
          { status: 503 }
        );
      }
      attempt += 1;
      await sleep(delay);
    }
  }

  return NextResponse.json({ added }, { status: 201 });
}

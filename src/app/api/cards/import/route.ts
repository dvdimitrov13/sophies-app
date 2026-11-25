import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Flashcard } from "@/lib/types";

const MAX_CARDS = 500;

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

// POST /api/cards/import — add many cards, skipping words already in the deck
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

  const added: Flashcard[] = [];
  for (const card of cards) {
    const word = card.englishWord.toLowerCase().trim();
    if (taken.has(word)) continue;
    taken.add(word);
    added.push({ ...card, englishWord: word });
  }

  if (added.length > 0) {
    // insertMany adds _id to each object; send back clean copies.
    await collection.insertMany(added.map((c) => ({ ...c })));
  }

  return NextResponse.json({ added }, { status: 201 });
}

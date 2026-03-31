import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/cards — fetch all cards
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const cards = await db.collection("cards").find({}).toArray();

  // Convert MongoDB _id to string and map to our Flashcard shape
  const result = cards.map(({ _id, ...rest }) => ({ ...rest, id: rest.id }));
  return NextResponse.json(result);
}

// POST /api/cards — add a new card
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const card = await request.json();
  const db = await getDb();

  // Check for duplicate
  const existing = await db
    .collection("cards")
    .findOne({ englishWord: card.englishWord.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json(
      { error: `"${card.englishWord}" is already in your flashcards!` },
      { status: 409 }
    );
  }

  await db.collection("cards").insertOne(card);
  return NextResponse.json(card, { status: 201 });
}

// PUT /api/cards — update a card (for spaced repetition updates)
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const card = await request.json();
  const db = await getDb();

  await db.collection("cards").updateOne({ id: card.id }, { $set: card });
  return NextResponse.json(card);
}

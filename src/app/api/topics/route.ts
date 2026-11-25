import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BUILT_IN_TOPICS, validTopicMeta, type TopicMeta } from "@/lib/topics";
import { loadCustomTopics } from "@/lib/topics-db";

// GET /api/topics — topics the generator created (built-in ones live in code)
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await loadCustomTopics());
}

// POST /api/topics — { topics: TopicMeta[] } saves new topics; existing names are kept as they are
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const list: unknown[] = Array.isArray(body.topics) ? body.topics.slice(0, 20) : [];
  const topics = list
    .map(validTopicMeta)
    .filter((t): t is TopicMeta => !!t && !BUILT_IN_TOPICS[t.name]);

  const db = await getDb();
  for (const t of topics) {
    await db.collection("topics").updateOne({ name: t.name }, { $setOnInsert: t }, { upsert: true });
  }
  return NextResponse.json(await loadCustomTopics());
}

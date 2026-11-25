import { getDb } from "./db";
import type { TopicMeta } from "./topics";

/** Topics the generator created, as stored in the database. */
export async function loadCustomTopics(): Promise<TopicMeta[]> {
  const db = await getDb();
  const docs = await db.collection("topics").find({}).toArray();
  return docs.map((d) => ({ name: d.name, english: d.english, emoji: d.emoji }));
}

import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  BUILT_IN_TOPICS,
  cleanTopicName,
  topicListForPrompt,
  validTopicMeta,
  type TopicMeta,
} from "@/lib/topics";
import { loadCustomTopics } from "@/lib/topics-db";

const client = new Anthropic();

const MAX_CARDS = 30;

function systemPrompt(topicList: string) {
  return `You build Bulgarian flashcards for an English-speaking A1-A2 beginner.

The learner describes a set of words they want, and you get the words they already have. Return only cards that are new: never repeat a word they have, whether it matches the English or the Bulgarian. Interpret the request the way a teacher would. For example, "the missing numbers from one to twenty" means every number from 1 to 20 that isn't already in their deck, and nothing else.

For each card:
- englishWord: the English word or short phrase, lowercase.
- bulgarianWord: the most common, basic Bulgarian translation in Cyrillic, the form a beginner learns first.
- bulgarianSentence: a short, natural sentence (3-8 words) using only A1-A2 vocabulary. It must contain bulgarianWord in exactly that form, because the app highlights the word inside the sentence.
- englishSentence: a natural English translation of that sentence. It must contain englishWord in exactly that form too (write numbers as words, e.g. "eighteen", not "18" or "6 p.m."), since the app highlights it when asking in the other direction.
- topic: the Bulgarian name of the topic the word belongs to (for example "числа", not "numbers").

Topics. The learner's current topics are: ${topicList}.
Use one of these whenever a word reasonably fits. Only when several words in this set clearly belong together and none of the current topics fits them, create a new topic: a short, lowercase Bulgarian name (one or two words, like the existing ones), and list it once in newTopics with its English name and one fitting emoji. Never create a topic for a single stray word (use "друго" for that), and never create one that overlaps an existing topic.

Return at most ${MAX_CARDS} cards, in a sensible learning order (for numbers, ascending). If the request asks for more than that, return the first ${MAX_CARDS} and say so in note. If nothing new fits the request, return no cards and explain why in note. Keep note to one short, friendly sentence for the learner; if you created a new topic, mention it.`;
}

const OUTPUT = jsonSchemaOutputFormat({
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          englishWord: { type: "string" },
          bulgarianWord: { type: "string" },
          bulgarianSentence: { type: "string" },
          englishSentence: { type: "string" },
          topic: { type: "string" },
        },
        required: ["englishWord", "bulgarianWord", "bulgarianSentence", "englishSentence", "topic"],
        additionalProperties: false,
      },
    },
    newTopics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          english: { type: "string" },
          emoji: { type: "string" },
        },
        required: ["name", "english", "emoji"],
        additionalProperties: false,
      },
    },
    note: { type: "string" },
  },
  required: ["cards", "newTopics", "note"],
  additionalProperties: false,
});

function clean(s: string) {
  return s.toLowerCase().replace(/[.,!?;:'"—–\-()]/g, "").replace(/\s+/g, " ").trim();
}

// POST /api/generate-set — { request } → proposed new cards (not saved yet)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ask = typeof body.request === "string" ? body.request.trim() : "";
  if (!ask || ask.length > 500) {
    return NextResponse.json({ error: "Describe the words you'd like (up to 500 characters)." }, { status: 400 });
  }

  const db = await getDb();
  const customTopics = await loadCustomTopics();
  const existing = await db
    .collection("cards")
    .find({}, { projection: { englishWord: 1, bulgarianWord: 1, topic: 1 } })
    .toArray();
  const deck = existing
    .map((c) => `${c.englishWord} = ${c.bulgarianWord} (${c.topic})`)
    .sort()
    .join("\n");

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: OUTPUT },
      system: systemPrompt(topicListForPrompt(customTopics)),
      messages: [
        {
          role: "user",
          content: `Words already in my deck (${existing.length}):\n${deck || "(none yet)"}\n\nWhat I'd like to add:\n${ask}`,
        },
      ],
    });
  } catch (error) {
    console.error("generate-set failed:", error);
    const busy = error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError;
    return NextResponse.json(
      { error: busy ? "The word generator is busy. Try again in a moment." : "Couldn't generate cards. Please try again." },
      { status: 502 }
    );
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return NextResponse.json(
      { error: "Couldn't make cards for that request. Try wording it differently." },
      { status: 422 }
    );
  }

  // Belt and braces: drop anything already in the deck or repeated in the batch.
  const takenEn = new Set(existing.map((c) => clean(String(c.englishWord))));
  const takenBg = new Set(existing.map((c) => clean(String(c.bulgarianWord))));
  const cards = response.parsed_output.cards
    .filter((c) => {
      const en = clean(c.englishWord);
      const bg = clean(c.bulgarianWord);
      if (!en || !bg || takenEn.has(en) || takenBg.has(bg)) return false;
      takenEn.add(en);
      takenBg.add(bg);
      return true;
    })
    .slice(0, MAX_CARDS);

  // New topics must be valid and actually used; any other unknown topic becomes "друго".
  const known = new Set([...Object.keys(BUILT_IN_TOPICS), ...customTopics.map((t) => t.name)]);
  const proposedTopics = new Map<string, TopicMeta>();
  for (const t of response.parsed_output.newTopics) {
    const meta = validTopicMeta(t);
    if (meta && !known.has(meta.name)) proposedTopics.set(meta.name, meta);
  }
  for (const card of cards) {
    const name = cleanTopicName(card.topic);
    card.topic = known.has(name) || proposedTopics.has(name) ? name : "друго";
  }
  const usedTopics = new Set(cards.map((c) => c.topic));
  const newTopics = [...proposedTopics.values()].filter((t) => usedTopics.has(t.name));

  return NextResponse.json({ cards, newTopics, note: response.parsed_output.note });
}

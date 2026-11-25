import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  BUILT_IN_TOPICS,
  cleanTopicName,
  topicListForPrompt,
  validTopicMeta,
} from "@/lib/topics";
import { loadCustomTopics } from "@/lib/topics-db";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();

    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "Please provide a word" },
        { status: 400 }
      );
    }

    const customTopics = await loadCustomTopics();
    const topicList = topicListForPrompt(customTopics);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a Bulgarian language teaching assistant helping an A1-A2 beginner. Given the English word "${word}", provide:

1. The most common, basic Bulgarian translation (in Cyrillic). Always prefer the simplest, most direct form — the one a beginner would learn first. Use interrogative forms over relative forms, base forms over derived forms, and standalone forms over compound forms.
2. A simple, natural Bulgarian sentence using this exact word form (in Cyrillic). Prefer questions for interrogative words. Keep it short (5-8 words), using only basic A1-A2 vocabulary.
3. The English translation of that sentence, in British English (colour, mum, flat, holiday).
4. A topic for this word, as its Bulgarian name. The learner's current topics are: ${topicList}. Use one of these whenever the word reasonably fits. Only if it clearly belongs to a common theme that none of them covers (for example "guitar" when there is no music topic), create a new topic: a short, lowercase Bulgarian name like the existing ones, and fill in newTopic with its English name and one fitting emoji. Otherwise set newTopic to null.

The learner's name is Sophie (Софи in Bulgarian). Sometimes use her name in the sentence where it fits naturally, e.g. "Софи пие кафе." / "Sophie drinks coffee."

Respond ONLY in this exact JSON format, no markdown:
{"bulgarianWord": "...", "bulgarianSentence": "...", "englishSentence": "...", "topic": "...", "newTopic": null}
or, for a new topic:
{"bulgarianWord": "...", "bulgarianSentence": "...", "englishSentence": "...", "topic": "музика", "newTopic": {"name": "музика", "english": "Music", "emoji": "🎵"}}

The topic value is always the Bulgarian name (e.g. "спалня" not "bedroom").`,
        },
      ],
    });

    let text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const parsed = JSON.parse(text);

    // Keep the topic to a known one or a valid new one; anything else is "друго".
    const known = new Set([...Object.keys(BUILT_IN_TOPICS), ...customTopics.map((t) => t.name)]);
    const topic = cleanTopicName(String(parsed.topic ?? ""));
    const newTopic = validTopicMeta(parsed.newTopic);
    if (known.has(topic)) {
      parsed.topic = topic;
      parsed.newTopic = null;
    } else if (newTopic && newTopic.name === topic) {
      parsed.topic = topic;
      parsed.newTopic = newTopic;
    } else {
      parsed.topic = "друго";
      parsed.newTopic = null;
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcard. Check your ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a Bulgarian language teaching assistant. Given the English word "${word}", provide:

1. The Bulgarian translation (in Cyrillic)
2. A simple, natural Bulgarian sentence using this word (in Cyrillic) — suitable for an A1-A2 learner
3. The English translation of that sentence
4. A semantic topic category for this word (one of: приветствия/greetings, семейство/family, храна/food, цветове/colors, числа/numbers, дрехи/clothing, тяло/body, дом/home, спалня/bedroom, кухня/kitchen, баня/bathroom, животни/animals, природа/nature, време/weather, професии/professions, транспорт/transport, училище/school, емоции/emotions, действия/actions, време-часове/time, пазаруване/shopping, здраве/health, спорт/sport, технологии/technology, друго/other)

Respond ONLY in this exact JSON format, no markdown:
{"bulgarianWord": "...", "bulgarianSentence": "...", "englishSentence": "...", "topic": "..."}

The topic value should be the Bulgarian word from the list above (e.g. "спалня" not "bedroom"). Keep the sentence short (5-10 words).`,
        },
      ],
    });

    let text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcard. Check your ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }
}

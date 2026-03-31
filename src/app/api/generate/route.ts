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
          content: `You are a Bulgarian language teaching assistant helping an A1-A2 beginner. Given the English word "${word}", provide:

1. The most common, basic Bulgarian translation (in Cyrillic). Always prefer the simplest, most direct form — the one a beginner would learn first. Use interrogative forms over relative forms, base forms over derived forms, and standalone forms over compound forms.
2. A simple, natural Bulgarian sentence using this exact word form (in Cyrillic). Prefer questions for interrogative words. Keep it short (5-8 words), using only basic A1-A2 vocabulary.
3. The English translation of that sentence.
4. A semantic topic category for this word (one of: приветствия/greetings, семейство/family, храна/food, цветове/colors, числа/numbers, дрехи/clothing, тяло/body, дом/home, спалня/bedroom, кухня/kitchen, баня/bathroom, животни/animals, природа/nature, време/weather, професии/professions, транспорт/transport, училище/school, емоции/emotions, действия/actions, време-часове/time, пазаруване/shopping, здраве/health, спорт/sport, технологии/technology, друго/other)

Respond ONLY in this exact JSON format, no markdown:
{"bulgarianWord": "...", "bulgarianSentence": "...", "englishSentence": "...", "topic": "..."}

The topic value should be the Bulgarian word from the list above (e.g. "спалня" not "bedroom").`,
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

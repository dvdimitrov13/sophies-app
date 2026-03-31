import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { userAttempt, correctSentence, englishSentence, englishWord, direction } =
      await request.json();

    const isEnToBg = direction !== "bg-to-en";

    if (!userAttempt || !correctSentence) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are a friendly Bulgarian language tutor helping a beginner student.

The student tried to translate this ${isEnToBg ? "English sentence into Bulgarian" : "Bulgarian sentence into English"}:
${isEnToBg ? "English" : "Bulgarian"}: "${englishSentence}" (key word: "${englishWord}")

Their attempt: "${userAttempt}"
The correct sentence: "${correctSentence}"

Give a short, encouraging hint (2-3 sentences max) that helps them get closer to the correct answer WITHOUT revealing the full sentence. You can:
- Point out which parts they got right
- Hint at specific words they're missing or got wrong
- Give a grammar tip if relevant
- Reveal individual words they're struggling with, but never the whole sentence

Keep it warm and supportive. Respond in English. Do not include the full correct sentence.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ hint: text.trim() });
  } catch (error) {
    console.error("Hint error:", error);
    return NextResponse.json(
      { error: "Failed to generate hint" },
      { status: 500 }
    );
  }
}

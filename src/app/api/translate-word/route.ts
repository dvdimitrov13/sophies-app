import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { word, fromLanguage, sentenceContext } = await request.json();

    if (!word || !fromLanguage) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const sourceLang = fromLanguage === "bg" ? "Bulgarian" : "English";
    const targetLang = fromLanguage === "bg" ? "English" : "Bulgarian";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: `Translate the single word "${word}" from ${sourceLang} to ${targetLang}. Context: "${sentenceContext}". Reply with ONLY the translation, nothing else.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return NextResponse.json({ translation: text });
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    );
  }
}

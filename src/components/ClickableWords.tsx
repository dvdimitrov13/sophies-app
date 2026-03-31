"use client";

import { useState } from "react";

interface Props {
  sentence: string;
  fromLanguage: "bg" | "en";
  onLookup: () => void;
  disabled?: boolean;
}

interface WordState {
  translation: string | null;
  loading: boolean;
}

export default function ClickableWords({
  sentence,
  fromLanguage,
  onLookup,
  disabled,
}: Props) {
  const [wordStates, setWordStates] = useState<Record<number, WordState>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const words = sentence.split(/\s+/);

  async function handleWordClick(index: number) {
    if (disabled) return;

    // If already translated, just toggle visibility
    if (wordStates[index]?.translation) {
      setActiveIndex(activeIndex === index ? null : index);
      return;
    }

    // Strip punctuation for the API call
    const rawWord = words[index].replace(/[.,!?;:'"—–\-()]/g, "");
    if (!rawWord) return;

    setWordStates((prev) => ({
      ...prev,
      [index]: { translation: null, loading: true },
    }));
    setActiveIndex(index);
    onLookup();

    try {
      const res = await fetch("/api/translate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: rawWord,
          fromLanguage,
          sentenceContext: sentence,
        }),
      });
      const data = await res.json();
      setWordStates((prev) => ({
        ...prev,
        [index]: { translation: data.translation || "?", loading: false },
      }));
    } catch {
      setWordStates((prev) => ({
        ...prev,
        [index]: { translation: "?", loading: false },
      }));
    }
  }

  return (
    <span className="leading-relaxed">
      {words.map((word, i) => {
        const state = wordStates[i];
        const isActive = activeIndex === i;

        return (
          <span key={i} className="relative inline-block">
            <span
              onClick={() => handleWordClick(i)}
              className={`cursor-pointer border-b border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-600 transition-colors ${
                disabled ? "cursor-default opacity-60" : ""
              }`}
            >
              {word}
            </span>

            {isActive && state && (
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                {state.loading ? "..." : state.translation}
              </span>
            )}

            {i < words.length - 1 && " "}
          </span>
        );
      })}
    </span>
  );
}

"use client";

import { useState } from "react";

interface Props {
  sentence: string;
  fromLanguage: "bg" | "en";
  targetWord: string;
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
  targetWord,
  onLookup,
  disabled,
}: Props) {
  const [wordStates, setWordStates] = useState<Record<number, WordState>>({});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lookedUpIndices, setLookedUpIndices] = useState<Set<number>>(
    new Set()
  );

  const words = sentence.split(/\s+/);

  const normalizedTarget = targetWord
    .toLowerCase()
    .replace(/[.,!?;:'"—–\-()]/g, "");

  function isTargetWord(word: string): boolean {
    const cleaned = word.toLowerCase().replace(/[.,!?;:'"—–\-()]/g, "");
    return cleaned === normalizedTarget;
  }

  async function handleWordClick(index: number) {
    if (disabled) return;
    if (isTargetWord(words[index])) return;
    // Already looked up — do nothing on click, hover handles it now
    if (wordStates[index]?.translation) return;

    const rawWord = words[index].replace(/[.,!?;:'"—–\-()]/g, "");
    if (!rawWord) return;

    setWordStates((prev) => ({
      ...prev,
      [index]: { translation: null, loading: true },
    }));

    if (!lookedUpIndices.has(index)) {
      setLookedUpIndices((prev) => new Set(prev).add(index));
      onLookup();
    }

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
        const isTarget = isTargetWord(word);
        const isLookedUp = !!state?.translation;
        const isLoading = !!state?.loading;
        const showPopover =
          !isTarget &&
          hoveredIndex === i &&
          (isLoading || isLookedUp);

        return (
          <span
            key={i}
            className="relative inline"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              onClick={() => handleWordClick(i)}
              className={
                isTarget
                  ? "font-bold"
                  : isLookedUp
                    ? "bg-yellow-200/60 rounded-sm px-0.5 -mx-0.5 transition-colors"
                    : `cursor-pointer border-b border-dashed border-gray-300 hover:bg-yellow-100/50 hover:rounded-sm transition-colors ${
                        disabled ? "cursor-default opacity-60" : ""
                      }`
              }
            >
              {word}
            </span>

            {showPopover && (
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                {isLoading ? "..." : state.translation}
              </span>
            )}

            {i < words.length - 1 && " "}
          </span>
        );
      })}
    </span>
  );
}

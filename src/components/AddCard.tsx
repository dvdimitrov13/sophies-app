"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/types";
import { createCard } from "@/lib/spaced-repetition";
import { isDuplicate } from "@/lib/storage";

interface Props {
  cards: Flashcard[];
  onAdd: (card: Flashcard) => void;
}

export default function AddCard({ cards, onAdd }: Props) {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    bulgarianWord: string;
    bulgarianSentence: string;
    englishSentence: string;
    topic: string;
  } | null>(null);

  async function handleGenerate() {
    const trimmed = word.trim();
    if (!trimmed) return;

    if (isDuplicate(cards, trimmed)) {
      setError(`"${trimmed}" is already in your flashcards!`);
      return;
    }

    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }

      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (!preview) return;
    const card = createCard(
      word.trim(),
      preview.bulgarianWord,
      preview.bulgarianSentence,
      preview.englishSentence,
      preview.topic
    );
    onAdd(card);
    setWord("");
    setPreview(null);
    setError("");
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Add New Word</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setError("");
            setPreview(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="Enter an English word..."
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-lg bg-white text-gray-900"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !word.trim()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="inline-block animate-spin">⟳</span>
          ) : (
            "Generate"
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-4">
          {error}
        </div>
      )}

      {preview && (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 space-y-4">
          <div>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Bulgarian Word
            </span>
            <p className="text-2xl font-bold text-gray-900">
              {preview.bulgarianWord}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Example Sentence
            </span>
            <p className="text-xl text-gray-800">{preview.bulgarianSentence}</p>
            <p className="text-sm text-gray-500 mt-1 italic">
              {preview.englishSentence}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Topic
            </span>
            <span className="ml-2 inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {preview.topic}
            </span>
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors"
          >
            Add to Flashcards
          </button>
        </div>
      )}
    </div>
  );
}

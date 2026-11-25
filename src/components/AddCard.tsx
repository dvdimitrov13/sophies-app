"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/types";
import { createCard } from "@/lib/spaced-repetition";
import { isDuplicate } from "@/lib/storage";
import { topicInfo, type TopicMeta } from "@/lib/topics";
import AddSet from "./AddSet";

interface Props {
  cards: Flashcard[];
  onAdd: (card: Flashcard) => void;
  onImport: (cards: Flashcard[]) => Promise<{ added: number; error?: string }>;
  onSaveTopics: (topics: TopicMeta[]) => Promise<void>;
}

type Mode = "word" | "set";

export default function AddCard({ cards, onAdd, onImport, onSaveTopics }: Props) {
  const [mode, setMode] = useState<Mode>("word");
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    bulgarianWord: string;
    bulgarianSentence: string;
    englishSentence: string;
    topic: string;
    newTopic: TopicMeta | null;
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

      setPreview(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!preview) return;
    if (preview.newTopic) await onSaveTopics([preview.newTopic]);
    onAdd(
      createCard(
        word.trim(),
        preview.bulgarianWord,
        preview.bulgarianSentence,
        preview.englishSentence,
        preview.topic,
      ),
    );
    setWord("");
    setPreview(null);
    setError("");
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-3xl font-bold tracking-tight">Add</h2>
        <div
          role="tablist"
          className="flex rounded-full bg-ink/[0.05] p-1 text-sm"
        >
          {(
            [
              ["word", "One word"],
              ["set", "A set"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-full px-3.5 py-1.5 font-semibold transition-colors ${
                mode === value
                  ? "bg-night text-lime-300"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-5 text-muted">
        {mode === "word"
          ? "Type an English word and get a Bulgarian card with an example sentence."
          : "Describe the words you want. Words already in your deck are skipped."}
      </p>

      {mode === "set" ? (
        <AddSet onImport={onImport} onSaveTopics={onSaveTopics} />
      ) : (
        <>
          <div className="surface flex gap-2 p-2">
            <input
              type="text"
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setError("");
                setPreview(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. strawberry"
              className="min-w-0 flex-1 rounded-2xl bg-transparent px-3 text-lg placeholder:text-ink/30 focus:outline-none"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !word.trim()}
              className="btn-primary"
            >
              {loading ? (
                <span className="inline-block animate-spin">⟳</span>
              ) : (
                "Generate"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300">
              {error}
            </div>
          )}

          {preview && (
            <div className="surface mt-4 space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Bulgarian</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {preview.bulgarianWord}
                  </p>
                </div>
                <span className="chip shrink-0 bg-lime-200/70 text-sm text-lime-900 dark:bg-lime-400/15 dark:text-lime-300">
                  {(preview.newTopic ?? topicInfo(preview.topic)).emoji} {preview.topic}
                  {preview.newTopic && (
                    <span className="rounded-full bg-lime-400 px-1.5 text-[10px] font-bold text-on-lime uppercase">
                      New
                    </span>
                  )}
                </span>
              </div>
              <div className="rounded-2xl bg-canvas p-4">
                <p className="eyebrow">Example</p>
                <p className="mt-1 text-xl">{preview.bulgarianSentence}</p>
                <p className="mt-1 text-sm text-muted italic">
                  {preview.englishSentence}
                </p>
              </div>
              <button onClick={handleAdd} className="btn-dark w-full text-lg">
                Add to flashcards
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

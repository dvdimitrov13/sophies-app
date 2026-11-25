"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/types";
import { createCard } from "@/lib/spaced-repetition";
import { isDuplicate } from "@/lib/storage";
import { buildStarterCards, STARTER_PACK_NAME, STARTER_PACK_SIZE } from "@/lib/starter-pack";
import { topicInfo } from "@/lib/topics";

interface Props {
  cards: Flashcard[];
  onAdd: (card: Flashcard) => void;
  onImport: (cards: Flashcard[]) => Promise<{ added: number; error?: string }>;
}

const PER_DAY = 10;

function StarterPack({ cards, onImport }: Pick<Props, "cards" | "onImport">) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const owned = new Set(cards.map((c) => c.englishWord));
  const missing = buildStarterCards(owned, PER_DAY);
  if (missing.length === 0 && !message) return null;

  async function handleImport() {
    setBusy(true);
    setMessage("");
    const { added, error } = await onImport(buildStarterCards(owned, PER_DAY));
    setBusy(false);
    setMessage(
      error
        ? error
        : `Added ${added} words. The first ${Math.min(PER_DAY, added)} are ready to review now.`
    );
  }

  const days = Math.ceil(missing.length / PER_DAY);

  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl bg-ink p-6 text-white">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-lime-400/25 blur-2xl" />
      <p className="eyebrow text-lime-300/80">Starter pack</p>
      <h3 className="mt-1 text-2xl font-bold tracking-tight">{STARTER_PACK_NAME}</h3>
      <p className="mt-1 max-w-sm text-white/70">
        {STARTER_PACK_SIZE} everyday words, from greetings and family to food and getting
        around, each with a simple example sentence.
      </p>
      {missing.length > 0 && (
        <>
          <p className="mt-3 text-sm text-white/50">
            {missing.length < STARTER_PACK_SIZE &&
              `${STARTER_PACK_SIZE - missing.length} already in your deck · `}
            {PER_DAY} new words a day over {days} days, so reviews stay manageable.
          </p>
          <button onClick={handleImport} disabled={busy} className="btn-primary mt-5">
            {busy ? "Adding…" : `Add ${missing.length} words`}
          </button>
        </>
      )}
      {message && <p className="mt-4 font-medium text-lime-300">{message}</p>}
    </div>
  );
}

export default function AddCard({ cards, onAdd, onImport }: Props) {
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

      setPreview(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (!preview) return;
    onAdd(
      createCard(
        word.trim(),
        preview.bulgarianWord,
        preview.bulgarianSentence,
        preview.englishSentence,
        preview.topic
      )
    );
    setWord("");
    setPreview(null);
    setError("");
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-3xl font-bold tracking-tight">Add a word</h2>
      <p className="mb-5 text-muted">
        Type an English word and get a Bulgarian card with an example sentence.
      </p>

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
          className="min-w-0 flex-1 rounded-2xl bg-transparent px-3 text-lg placeholder:text-black/30 focus:outline-none"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !word.trim()}
          className="btn-primary"
        >
          {loading ? <span className="inline-block animate-spin">⟳</span> : "Generate"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
          {error}
        </div>
      )}

      {preview && (
        <div className="surface mt-4 space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Bulgarian</p>
              <p className="text-3xl font-bold tracking-tight">{preview.bulgarianWord}</p>
            </div>
            <span className="chip bg-lime-200/70 text-sm text-lime-900">
              {topicInfo(preview.topic).emoji} {preview.topic}
            </span>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <p className="eyebrow">Example</p>
            <p className="mt-1 text-xl">{preview.bulgarianSentence}</p>
            <p className="mt-1 text-sm text-muted italic">{preview.englishSentence}</p>
          </div>
          <button onClick={handleAdd} className="btn-dark w-full text-lg">
            Add to flashcards
          </button>
        </div>
      )}

      <StarterPack cards={cards} onImport={onImport} />
    </div>
  );
}

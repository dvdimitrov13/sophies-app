"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/types";
import { createCard, DAY_MS } from "@/lib/spaced-repetition";
import { topicInfo, type TopicMeta } from "@/lib/topics";

interface Proposed {
  englishWord: string;
  bulgarianWord: string;
  bulgarianSentence: string;
  englishSentence: string;
  topic: string;
}

interface Props {
  onImport: (cards: Flashcard[]) => Promise<{ added: number; error?: string }>;
  onSaveTopics: (topics: TopicMeta[]) => Promise<void>;
}

const EXAMPLES = [
  "The missing numbers from one to twenty",
  "Days of the week",
  "Common things in a café",
  "Verbs for cooking",
];

const PER_DAY = 10;

/** Describe a set of words ("the missing numbers 1–20"), review, then add. */
export default function AddSet({ onImport, onSaveTopics }: Props) {
  const [ask, setAsk] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [note, setNote] = useState("");
  const [proposed, setProposed] = useState<Proposed[] | null>(null);
  const [newTopics, setNewTopics] = useState<TopicMeta[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [spread, setSpread] = useState(true);

  async function handleGenerate() {
    const text = ask.trim();
    if (!text) return;
    setLoading(true);
    setError("");
    setDone("");
    setNote("");
    setProposed(null);
    setNewTopics([]);
    try {
      const res = await fetch("/api/generate-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't generate cards.");
      setProposed(data.cards);
      setPicked(new Set(data.cards.map((_: Proposed, i: number) => i)));
      setNote(data.note ?? "");
      setNewTopics(Array.isArray(data.newTopics) ? data.newTopics : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!proposed) return;
    const chosen = proposed.filter((_, i) => picked.has(i));
    // Save only the new topics that the chosen cards actually use.
    const used = new Set(chosen.map((c) => c.topic));
    await onSaveTopics(newTopics.filter((t) => used.has(t.name)));
    const now = Date.now();
    const cards = chosen.map((c, i) =>
      createCard(
        c.englishWord,
        c.bulgarianWord,
        c.bulgarianSentence,
        c.englishSentence,
        c.topic,
        spread ? now + Math.floor(i / PER_DAY) * DAY_MS : now
      )
    );
    setSaving(true);
    setError("");
    const { added, error: saveError } = await onImport(cards);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setDone(
      added === 0
        ? "Those words were already in your deck."
        : `Added ${added} ${added === 1 ? "word" : "words"}${
            spread && added > PER_DAY ? `, unlocking ${PER_DAY} a day` : ""
          }.`
    );
    setProposed(null);
    setNewTopics([]);
    setNote("");
    setAsk("");
  }

  function toggle(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const count = picked.size;

  return (
    <div>
      <div className="surface p-2">
        <textarea
          value={ask}
          onChange={(e) => {
            setAsk(e.target.value);
            setError("");
            setDone("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!loading) handleGenerate();
            }
          }}
          rows={2}
          maxLength={500}
          placeholder="e.g. the missing numbers from one to twenty"
          className="w-full resize-none rounded-2xl bg-transparent px-3 py-2 text-lg placeholder:text-ink/30 focus:outline-none"
        />
        <div className="flex justify-end px-1 pb-1">
          <button
            onClick={handleGenerate}
            disabled={loading || !ask.trim()}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">⟳</span> Finding words…
              </>
            ) : (
              "Suggest words"
            )}
          </button>
        </div>
      </div>

      {!proposed && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setAsk(ex)}
              className="chip bg-ink/[0.05] text-xs font-medium text-ink-soft hover:bg-ink/[0.09]"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="mt-3 text-sm text-muted">
          Checking your deck and picking new words. This takes up to half a minute.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300">
          {error}
        </div>
      )}

      {done && <p className="mt-4 font-medium text-lime-700 dark:text-lime-300">{done}</p>}

      {proposed && (
        <div className="mt-4">
          {note && <p className="mb-3 text-ink-soft">{note}</p>}
          {newTopics.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">
                New {newTopics.length === 1 ? "topic" : "topics"}:
              </span>
              {newTopics.map((t) => (
                <span
                  key={t.name}
                  className="chip bg-lime-200/70 text-lime-900 dark:bg-lime-400/15 dark:text-lime-300"
                >
                  {t.emoji} {t.name}
                  <span className="font-normal opacity-70">{t.english}</span>
                </span>
              ))}
            </div>
          )}

          {proposed.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">
                  {count} of {proposed.length} selected
                </span>
                <button
                  onClick={() =>
                    setPicked(
                      count === proposed.length ? new Set() : new Set(proposed.map((_, i) => i))
                    )
                  }
                  className="font-semibold text-ink-soft hover:text-ink"
                >
                  {count === proposed.length ? "Select none" : "Select all"}
                </button>
              </div>

              <ul className="space-y-2">
                {proposed.map((c, i) => {
                  const on = picked.has(i);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => toggle(i)}
                        aria-pressed={on}
                        className={`surface flex w-full items-start gap-3 p-4 text-left transition-opacity ${
                          on ? "" : "opacity-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-xs font-bold ${
                            on ? "bg-lime-400 text-on-lime" : "border-2 border-ink/15"
                          }`}
                        >
                          {on && "✓"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="text-lg">
                              <span className="font-bold">{c.bulgarianWord}</span>
                              <span className="mx-2 text-ink/25">·</span>
                              <span className="text-ink-soft">{c.englishWord}</span>
                            </span>
                            <span className="text-xs text-muted">
                              {(newTopics.find((t) => t.name === c.topic) ?? topicInfo(c.topic)).emoji}{" "}
                              {c.topic}
                            </span>
                          </span>
                          <span className="mt-1 block text-ink-soft">{c.bulgarianSentence}</span>
                          <span className="block text-sm text-muted italic">{c.englishSentence}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] mt-4 space-y-2 rounded-3xl bg-night p-3 text-white shadow-2xl">
                {count > PER_DAY && (
                  <label className="flex items-center gap-2 px-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={spread}
                      onChange={(e) => setSpread(e.target.checked)}
                      className="size-4 accent-lime-400"
                    />
                    Unlock {PER_DAY} a day so reviews stay manageable
                  </label>
                )}
                <button
                  onClick={handleAdd}
                  disabled={saving || count === 0}
                  className="btn-primary w-full"
                >
                  {saving ? "Adding…" : `Add ${count} ${count === 1 ? "word" : "words"}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

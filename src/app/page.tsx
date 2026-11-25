"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DirectionPref, Flashcard, UserStats } from "@/lib/types";
import { getCardsForReview } from "@/lib/spaced-repetition";
import {
  loadCards,
  addCard,
  importCards,
  updateCard,
  loadStats,
  addToScore,
  recordStudyDay,
  saveDirectionPref,
} from "@/lib/storage";
import { liveStreak, localDateKey } from "@/lib/streak";
import AddCard from "@/components/AddCard";
import ReviewSession from "@/components/ReviewSession";
import TopicBrowser from "@/components/TopicBrowser";
import { signOutAction } from "./actions";

type Tab = "review" | "topics" | "add";

function nextDueLabel(cards: Flashcard[]): string | null {
  const upcoming = cards
    .map((c) => c.nextReviewDate)
    .filter((t) => t > Date.now())
    .sort((a, b) => a - b)[0];
  if (!upcoming) return null;
  const hours = (upcoming - Date.now()) / 3_600_000;
  if (hours < 1) return "in under an hour";
  if (hours < 24) return `in ${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export default function Home() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const recordingStudy = useRef(false);

  useEffect(() => {
    Promise.all([loadCards(), loadStats()]).then(([c, s]) => {
      setCards(c);
      setStats(s);
      setLoaded(true);
    });
  }, []);

  const handleAddCard = useCallback(async (card: Flashcard) => {
    const result = await addCard(card);
    if (!result.error) {
      setCards((prev) => [...prev, card]);
    }
  }, []);

  const handleImport = useCallback(async (newCards: Flashcard[]) => {
    const { added, error } = await importCards(newCards);
    if (added.length > 0) setCards((prev) => [...prev, ...added]);
    return { added: added.length, error };
  }, []);

  const handleUpdateCard = useCallback(async (updated: Flashcard) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await updateCard(updated);
  }, []);

  // The first answer of the day extends the streak.
  const handleAnswered = useCallback(async () => {
    if (recordingStudy.current || stats?.lastStudyDate === localDateKey()) return;
    recordingStudy.current = true;
    const next = await recordStudyDay();
    if (next) setStats(next);
    recordingStudy.current = false;
  }, [stats?.lastStudyDate]);

  const handleDirectionChange = useCallback((directionPref: DirectionPref) => {
    setStats((prev) => (prev ? { ...prev, directionPref } : prev));
    saveDirectionPref(directionPref);
  }, []);

  const handleSessionComplete = useCallback(async (points: number) => {
    if (points > 0) {
      const next = await addToScore(points);
      if (next) setStats(next);
    }
  }, []);

  if (!loaded || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-lime-200 border-t-lime-500" />
      </div>
    );
  }

  const due = getCardsForReview(cards);
  const streak = liveStreak(stats.currentStreak, stats.lastStudyDate);
  const studiedToday = stats.lastStudyDate === localDateKey();

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "review", label: "Review", badge: due.length },
    { id: "topics", label: "Topics" },
    { id: "add", label: "Add" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime-400 text-xl font-black text-ink shadow-[inset_0_-3px_0_rgba(20,23,15,0.15)]">
              Б
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg leading-tight font-bold tracking-tight">
                Софи&apos;s Bulgarian
              </h1>
              <p className="text-sm text-muted">
                {cards.length} {cards.length === 1 ? "card" : "cards"} · {due.length} due
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              title={
                studiedToday
                  ? `${streak}-day streak. Today is done!`
                  : streak > 0
                    ? `${streak}-day streak. Answer a card today to keep it going.`
                    : "Answer a card to start a streak"
              }
              className={`chip ${
                studiedToday ? "bg-ink text-lime-300" : "bg-black/[0.05] text-ink-soft"
              }`}
            >
              <span className={studiedToday ? "" : "opacity-40 grayscale"}>🔥</span>
              {streak}
            </span>
            <span className="chip bg-lime-300/70 text-ink" title="Total points">
              {stats.totalScore.toLocaleString()} pts
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
                  <path
                    d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M13 14l4-4-4-4M17 10H8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex rounded-2xl bg-black/[0.05] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="rounded-full bg-lime-400 px-1.5 text-xs leading-5 font-bold text-ink tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {activeTab === "review" && (
          <ReviewSession
            key={reviewKey}
            queue={due}
            mode="review"
            title="Review"
            directionPref={stats.directionPref}
            onDirectionChange={handleDirectionChange}
            onUpdateCard={handleUpdateCard}
            onAnswered={handleAnswered}
            onSessionComplete={handleSessionComplete}
            onRestart={() => setReviewKey((k) => k + 1)}
            restartLabel="Check for more"
            empty={
              <div className="surface mx-auto max-w-lg px-6 py-12 text-center">
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-lime-300 text-3xl">
                  ✓
                </div>
                <h2 className="text-2xl font-bold tracking-tight">All caught up!</h2>
                <p className="mt-1 text-muted">
                  {nextDueLabel(cards)
                    ? `Your next card is due ${nextDueLabel(cards)}.`
                    : "Add some words to get started."}
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => setActiveTab("topics")} className="btn-primary">
                    Take a topic test
                  </button>
                  <button onClick={() => setActiveTab("add")} className="btn-soft">
                    Add words
                  </button>
                </div>
              </div>
            }
          />
        )}
        {activeTab === "topics" && (
          <TopicBrowser
            cards={cards}
            directionPref={stats.directionPref}
            onDirectionChange={handleDirectionChange}
            onAnswered={handleAnswered}
            onSessionComplete={handleSessionComplete}
          />
        )}
        {activeTab === "add" && (
          <AddCard cards={cards} onAdd={handleAddCard} onImport={handleImport} />
        )}
      </main>
    </div>
  );
}

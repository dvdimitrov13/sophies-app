"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DirectionPref, Flashcard, UserStats } from "@/lib/types";
import { getCardsForReview } from "@/lib/spaced-repetition";
import {
  loadCards,
  loadTopics,
  saveTopics,
  importCards,
  addCard,
  updateCard,
  loadStats,
  addToScore,
  recordStudyDay,
  saveDirectionPref,
} from "@/lib/storage";
import { liveStreak, localDateKey } from "@/lib/streak";
import { setCustomTopics, type TopicMeta } from "@/lib/topics";
import AddCard from "@/components/AddCard";
import ReviewSession from "@/components/ReviewSession";
import TopicBrowser from "@/components/TopicBrowser";
import HeaderMenu from "@/components/HeaderMenu";
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
    Promise.all([loadCards(), loadStats(), loadTopics()]).then(([c, s, t]) => {
      setCustomTopics(t);
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


  // New topics are saved before their cards, so tiles have a name and emoji.
  const handleSaveTopics = useCallback(async (topics: TopicMeta[]) => {
    if (topics.length === 0) return;
    const all = await saveTopics(topics);
    if (all) setCustomTopics(all);
  }, []);

  const handleImport = useCallback(async (newCards: Flashcard[]) => {
    const { added, error } = await importCards(newCards);
    // Reload from the server so cards saved before any error show up too.
    setCards(await loadCards());
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
      <header className="sticky top-0 z-10 border-b border-ink/5 bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-3 pb-3 sm:pt-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-400 text-lg font-black text-on-lime shadow-[inset_0_-3px_0_rgba(20,23,15,0.15)] sm:size-11 sm:rounded-2xl sm:text-xl">
              Б
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base leading-tight font-bold tracking-tight sm:text-lg">
                Bulganki
              </h1>
              <p className="hidden text-sm text-muted sm:block">
                {cards.length} {cards.length === 1 ? "card" : "cards"} · {due.length} due
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span
              title={
                studiedToday
                  ? `${streak}-day streak. Today is done!`
                  : streak > 0
                    ? `${streak}-day streak. Answer a card today to keep it going.`
                    : "Answer a card to start a streak"
              }
              className={`chip px-2.5 sm:px-3 ${
                studiedToday ? "bg-night text-lime-300" : "bg-ink/[0.05] text-ink-soft"
              }`}
            >
              <span className={studiedToday ? "" : "opacity-40 grayscale"}>🔥</span>
              {streak}
            </span>
            <span
              className="chip px-2.5 whitespace-nowrap bg-lime-300/70 text-on-lime sm:px-3 dark:bg-lime-400/20 dark:text-lime-300"
              title="Total points"
            >
              {stats.totalScore.toLocaleString()} pts
            </span>
            <HeaderMenu
              cardCount={cards.length}
              longestStreak={stats.longestStreak}
              signOutAction={signOutAction}
            />
          </div>
        </div>

        <nav className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex rounded-2xl bg-ink/[0.05] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all sm:py-2 ${
                  activeTab === tab.id
                    ? "bg-surface text-ink shadow-sm dark:bg-ink/15"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="rounded-full bg-lime-400 px-1.5 text-xs leading-5 font-bold text-on-lime tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pt-8">
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
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-lime-300 text-3xl text-on-lime">
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
          <AddCard
            cards={cards}
            onAdd={handleAddCard}
            onImport={handleImport}
            onSaveTopics={handleSaveTopics}
          />
        )}
      </main>
    </div>
  );
}

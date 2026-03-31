"use client";

import { useState, useEffect, useCallback } from "react";
import { Flashcard } from "@/lib/types";
import { getCardsForReview } from "@/lib/spaced-repetition";
import { loadCards, addCard, updateCard, loadStats, addToScore } from "@/lib/storage";
import AddCard from "@/components/AddCard";
import ReviewSession from "@/components/ReviewSession";
import TopicBrowser from "@/components/TopicBrowser";
import { signOutAction } from "./actions";

type Tab = "add" | "review" | "topics";

export default function Home() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const [loaded, setLoaded] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    Promise.all([loadCards(), loadStats()]).then(([c, stats]) => {
      setCards(c);
      setTotalScore(stats.totalScore);
      setLoaded(true);
    });
  }, []);

  const handleAddCard = useCallback(async (card: Flashcard) => {
    const result = await addCard(card);
    if (!result.error) {
      setCards((prev) => [...prev, card]);
    }
  }, []);

  const handleUpdateCard = useCallback(async (updated: Flashcard) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    await updateCard(updated);
  }, []);

  const handleSessionComplete = useCallback(async (points: number) => {
    if (points > 0) {
      const result = await addToScore(points);
      setTotalScore(result.totalScore);
    }
  }, []);

  const dueCount = loaded ? getCardsForReview(cards).length : 0;

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Софи&apos;s Bulgarian
            </h1>
            <p className="text-sm text-gray-500">
              {cards.length} cards &middot; {dueCount} due for review
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm font-semibold text-indigo-600">
              {totalScore.toLocaleString()} pts
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 flex">
          {(
            [
              { id: "add", label: "Add Word" },
              {
                id: "review",
                label: `Review${dueCount > 0 ? ` (${dueCount})` : ""}`,
              },
              { id: "topics", label: "Topics" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {activeTab === "add" && (
          <AddCard cards={cards} onAdd={handleAddCard} />
        )}
        {activeTab === "review" && (
          <ReviewSession cards={cards} onUpdateCard={handleUpdateCard} onSessionComplete={handleSessionComplete} />
        )}
        {activeTab === "topics" && <TopicBrowser cards={cards} />}
      </main>
    </div>
  );
}

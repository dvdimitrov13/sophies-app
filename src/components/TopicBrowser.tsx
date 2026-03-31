"use client";

import { useState } from "react";
import { Flashcard } from "@/lib/types";
import { getTopics, getCardsByTopic } from "@/lib/storage";

interface Props {
  cards: Flashcard[];
}

export default function TopicBrowser({ cards }: Props) {
  const topics = getTopics(cards);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-2xl font-bold mb-2">No cards yet</h2>
        <p className="text-gray-500">
          Add some words to start building your collection!
        </p>
      </div>
    );
  }

  if (selectedTopic) {
    const topicCards = getCardsByTopic(cards, selectedTopic);
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedTopic(null)}
          className="text-indigo-600 hover:text-indigo-800 font-medium mb-4 inline-block"
        >
          ← Back to topics
        </button>
        <h2 className="text-2xl font-bold mb-4">{selectedTopic}</h2>
        <div className="space-y-3">
          {topicCards.map((card) => {
            const nextReview = new Date(card.nextReviewDate);
            const isDue = card.nextReviewDate <= Date.now();
            return (
              <div
                key={card.id}
                className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-lg font-semibold text-gray-900">
                      {card.englishWord}
                    </span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-lg text-indigo-700">
                      {card.bulgarianWord}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isDue
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isDue
                      ? "Due now"
                      : `Next: ${nextReview.toLocaleDateString()}`}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{card.bulgarianSentence}</p>
                <p className="text-sm text-gray-400 italic">
                  {card.englishSentence}
                </p>
                <div className="mt-2 flex gap-3 text-xs text-gray-400">
                  <span>Ease: {card.easeFactor.toFixed(1)}</span>
                  <span>Interval: {card.interval}d</span>
                  <span>Reviews: {card.repetitions}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Topics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topics.map((topic) => {
          const count = getCardsByTopic(cards, topic).length;
          const dueCount = getCardsByTopic(cards, topic).filter(
            (c) => c.nextReviewDate <= Date.now()
          ).length;
          return (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-indigo-300 transition-colors text-left shadow-sm"
            >
              <p className="font-semibold text-gray-900">{topic}</p>
              <p className="text-sm text-gray-500">{count} cards</p>
              {dueCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {dueCount} due for review
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

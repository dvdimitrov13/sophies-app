"use client";

import { useState } from "react";
import { DirectionPref, Flashcard } from "@/lib/types";
import { getTopics, getCardsByTopic } from "@/lib/storage";
import { shuffle, stabilityOf } from "@/lib/spaced-repetition";
import { topicInfo } from "@/lib/topics";
import ReviewSession from "./ReviewSession";

interface Props {
  cards: Flashcard[];
  directionPref: DirectionPref;
  onDirectionChange: (pref: DirectionPref) => void;
  onAnswered: () => void;
  onSessionComplete: (points: number) => void;
}

const LENGTHS = [10, 20, 0] as const; // 0 = every card
type Length = (typeof LENGTHS)[number];

interface TestRun {
  key: number;
  title: string;
  topics: string[];
  queue: Flashcard[];
}

function isLearned(card: Flashcard): boolean {
  return card.repetitions > 0;
}

function formatDue(card: Flashcard, now: number): string {
  const ms = card.nextReviewDate - now;
  if (ms <= 0) return "Due now";
  const days = ms / 86_400_000;
  if (days < 1) return `In ${Math.max(1, Math.round(days * 24))}h`;
  if (days < 30) return `In ${Math.round(days)}d`;
  return new Date(card.nextReviewDate).toLocaleDateString();
}

export default function TopicBrowser({
  cards,
  directionPref,
  onDirectionChange,
  onAnswered,
  onSessionComplete,
}: Props) {
  const topics = getTopics(cards);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [length, setLength] = useState<Length>(10);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [test, setTest] = useState<TestRun | null>(null);
  // Read the clock once per visit to this tab; render must stay pure.
  const [now] = useState(() => Date.now());

  function buildTest(topicList: string[], key: number): TestRun {
    const pool = cards.filter((c) => topicList.includes(c.topic));
    const picked = shuffle(pool);
    const title =
      topicList.length === 1
        ? `Test · ${topicList[0]}`
        : `Test · ${topicList.length} topics`;
    return {
      key,
      title,
      topics: topicList,
      queue: length === 0 ? picked : picked.slice(0, length),
    };
  }

  function startTest(topicList: string[]) {
    setTest(buildTest(topicList, now + Math.random()));
  }

  if (test) {
    return (
      <ReviewSession
        key={test.key}
        queue={test.queue}
        mode="test"
        title={test.title}
        directionPref={directionPref}
        onDirectionChange={onDirectionChange}
        onAnswered={onAnswered}
        onSessionComplete={onSessionComplete}
        onRestart={() => setTest(buildTest(test.topics, Date.now()))}
        restartLabel="New test"
        onExit={() => setTest(null)}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <div className="surface mx-auto max-w-lg px-6 py-12 text-center">
        <div className="mb-3 text-5xl">📚</div>
        <h2 className="text-2xl font-bold tracking-tight">No cards yet</h2>
        <p className="mt-1 text-muted">
          Add some words to start building your topics.
        </p>
      </div>
    );
  }

  if (openTopic) {
    const topicCards = getCardsByTopic(cards, openTopic);
    const info = topicInfo(openTopic);
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setOpenTopic(null)}
          className="mb-4 text-sm font-semibold text-muted hover:text-ink"
        >
          ← All topics
        </button>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-4xl">{info.emoji}</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight">{openTopic}</h2>
            <p className="text-muted">
              {info.english && `${info.english} · `}
              {topicCards.length} words
            </p>
          </div>
          <button onClick={() => startTest([openTopic])} className="btn-primary shrink-0">
            Test this topic
          </button>
        </div>
        <ul className="space-y-2.5">
          {topicCards.map((card) => {
            const isDue = card.nextReviewDate <= now;
            return (
              <li key={card.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg">
                    <span className="font-bold">{card.bulgarianWord}</span>
                    <span className="mx-2 text-ink/25">·</span>
                    <span className="text-ink-soft">{card.englishWord}</span>
                  </p>
                  <span
                    className={`chip shrink-0 text-xs ${
                      isDue ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300" : "bg-lime-200/70 text-lime-900 dark:bg-lime-400/15 dark:text-lime-300"
                    }`}
                  >
                    {formatDue(card, now)}
                  </span>
                </div>
                <p className="mt-1 text-ink-soft">{card.bulgarianSentence}</p>
                <p className="text-sm text-muted italic">{card.englishSentence}</p>
                <div className="mt-2 flex gap-3 text-xs text-muted">
                  <span>Reviews: {card.repetitions}</span>
                  {isLearned(card) && (
                    <span>Memory strength: {Math.round(stabilityOf(card))}d</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const selectedList = topics.filter((t) => selected.has(t));
  const selectedCount = cards.filter((c) => selected.has(c.topic)).length;
  const questionCount = length === 0 ? selectedCount : Math.min(length, selectedCount);

  function toggle(topic: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl pb-36 sm:pb-28">
      <div className="mb-5">
        <h2 className="text-3xl font-bold tracking-tight">Topics</h2>
        <p className="text-muted">
          Select topics to test yourself. Tests don&apos;t change your review schedule.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {topics.map((topic) => {
          const topicCards = getCardsByTopic(cards, topic);
          const learned = topicCards.filter(isLearned).length;
          const due = topicCards.filter((c) => c.nextReviewDate <= now).length;
          const info = topicInfo(topic);
          const isSelected = selected.has(topic);
          return (
            <div
              key={topic}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => toggle(topic)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle(topic);
                }
              }}
              className={`group relative cursor-pointer rounded-3xl border-2 bg-surface p-4 text-left transition-all hover:-translate-y-0.5 ${
                isSelected
                  ? "border-lime-400 shadow-[0_0_0_4px_rgba(190,242,100,0.45)]"
                  : "border-transparent shadow-[0_1px_2px_rgba(20,23,15,0.04),0_12px_32px_-16px_rgba(20,23,15,0.18)]"
              }`}
            >
              <span
                className={`absolute top-3 right-3 grid size-6 place-items-center rounded-full text-xs font-bold transition-colors ${
                  isSelected ? "bg-lime-400 text-on-lime" : "border-2 border-ink/10 text-transparent"
                }`}
              >
                ✓
              </span>
              <p className="text-2xl">{info.emoji}</p>
              <p className="mt-2 font-bold leading-tight">{topic}</p>
              <p className="text-xs text-muted">{info.english ?? " "}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <div
                  className="h-full rounded-full bg-lime-400"
                  style={{ width: `${(learned / topicCards.length) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {learned}/{topicCards.length} learned
                </span>
                {due > 0 && <span className="font-semibold text-amber-600">{due} due</span>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTopic(topic);
                }}
                className="mt-3 text-xs font-semibold text-ink-soft underline decoration-ink/20 underline-offset-4 hover:decoration-ink"
              >
                See words
              </button>
            </div>
          );
        })}
      </div>

      {selectedList.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 sm:pb-4">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-3xl bg-night p-3 pl-5 text-white shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {selectedList.length === 1 ? selectedList[0] : `${selectedList.length} topics`}
              </p>
              <p className="text-xs text-white/60">{selectedCount} {selectedCount === 1 ? "word" : "words"} to draw from</p>
            </div>
            <div className="flex rounded-full bg-white/10 p-1 text-sm">
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLength(n)}
                  className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                    length === n ? "bg-lime-300 text-on-lime" : "text-white/70 hover:text-white"
                  }`}
                >
                  {n === 0 ? "All" : n}
                </button>
              ))}
            </div>
            <button onClick={() => startTest(selectedList)} className="btn-primary w-full py-2.5 sm:w-auto">
              Start test · {questionCount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

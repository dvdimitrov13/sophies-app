"use client";

import { useState, useRef } from "react";
import { Flashcard } from "@/lib/types";
import { getCardsForReview, reviewCard } from "@/lib/spaced-repetition";

type Phase = "answering" | "hint" | "retrying" | "result";

interface Props {
  cards: Flashcard[];
  onUpdateCard: (card: Flashcard) => void;
}

export default function ReviewSession({ cards, onUpdateCard }: Props) {
  const snapshotRef = useRef<Flashcard[] | null>(null);
  if (snapshotRef.current === null) {
    snapshotRef.current = getCardsForReview(cards);
  }
  const dueCards = snapshotRef.current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [firstAttempt, setFirstAttempt] = useState("");
  const [sessionDone, setSessionDone] = useState(false);
  const [finalCorrect, setFinalCorrect] = useState(false);
  const [gotItSecondTry, setGotItSecondTry] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });

  if (dueCards.length === 0 && !sessionDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">No cards due for review!</h2>
        <p className="text-gray-500">
          Add some new words or come back later when cards are due.
        </p>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {score.correct}
            </div>
            <div className="text-sm text-gray-500">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">
              {score.incorrect}
            </div>
            <div className="text-sm text-gray-500">Needs practice</div>
          </div>
        </div>
        <button
          onClick={() => {
            setCurrentIndex(0);
            setSessionDone(false);
            setScore({ correct: 0, incorrect: 0 });
          }}
          className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Review Again
        </button>
      </div>
    );
  }

  const card = dueCards[currentIndex];

  function normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[.,!?;:'"—–\-()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function handleFirstCheck() {
    const correct = normalize(userInput) === normalize(card.bulgarianSentence);
    if (correct) {
      setFinalCorrect(true);
      setGotItSecondTry(false);
      setPhase("result");
      const updated = reviewCard(card, 5);
      onUpdateCard(updated);
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setFirstAttempt(userInput);
      setPhase("hint");
    }
  }

  async function handleGetHint() {
    setHintLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAttempt: firstAttempt,
          correctSentence: card.bulgarianSentence,
          englishSentence: card.englishSentence,
          englishWord: card.englishWord,
        }),
      });
      const data = await res.json();
      setHint(data.hint || "Try thinking about each word in the sentence one at a time.");
    } catch {
      setHint("Try thinking about each word in the sentence one at a time.");
    } finally {
      setHintLoading(false);
      setUserInput("");
      setPhase("retrying");
    }
  }

  function handleTryAgain() {
    setUserInput("");
    setPhase("retrying");
  }

  function handleSecondCheck() {
    const correct = normalize(userInput) === normalize(card.bulgarianSentence);
    if (correct) {
      setFinalCorrect(true);
      setGotItSecondTry(true);
      const updated = reviewCard(card, 3);
      onUpdateCard(updated);
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setFinalCorrect(false);
      setGotItSecondTry(false);
      const updated = reviewCard(card, 0);
      onUpdateCard(updated);
      setScore((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
    setPhase("result");
  }

  function handleNext() {
    setPhase("answering");
    setUserInput("");
    setHint("");
    setFirstAttempt("");
    setFinalCorrect(false);
    setGotItSecondTry(false);
    if (currentIndex + 1 >= dueCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review</h2>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {dueCards.length}
        </span>
      </div>

      <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 shadow-sm space-y-4">
        {/* Card prompt — always visible */}
        <div>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            English
          </span>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            {card.englishWord}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Translate this sentence
          </span>
          <p className="text-lg text-indigo-700 font-medium mt-1">
            {card.englishSentence}
          </p>
        </div>

        {/* Phase: answering */}
        {phase === "answering" && (
          <>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim()) handleFirstCheck();
                }
              }}
              placeholder="Type the full Bulgarian sentence..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-lg resize-none bg-white text-gray-900"
              rows={2}
              autoFocus
            />
            <button
              onClick={handleFirstCheck}
              disabled={!userInput.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Check
            </button>
          </>
        )}

        {/* Phase: hint — first attempt was wrong */}
        {phase === "hint" && (
          <div className="space-y-4">
            <div className="-mx-6 -mt-2 px-6 py-4 text-center bg-amber-50 rounded-none">
              <p className="font-bold text-xl text-amber-700">Almost there!</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Your attempt
              </p>
              <p className="text-lg text-gray-600">{firstAttempt}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGetHint}
                disabled={hintLoading}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold text-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {hintLoading ? "Thinking..." : "Get a Hint"}
              </button>
              <button
                onClick={handleTryAgain}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Phase: retrying — second attempt with optional hint */}
        {phase === "retrying" && (
          <div className="space-y-4">
            <div className="-mx-6 -mt-2 px-6 py-4 text-center bg-amber-50 rounded-none">
              <p className="font-bold text-xl text-amber-700">
                Give it another shot!
              </p>
            </div>
            {hint && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">
                  Hint
                </p>
                <p className="text-gray-700">{hint}</p>
              </div>
            )}
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (userInput.trim()) handleSecondCheck();
                }
              }}
              placeholder="Try again..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-lg resize-none bg-white text-gray-900"
              rows={2}
              autoFocus
            />
            <button
              onClick={handleSecondCheck}
              disabled={!userInput.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Check
            </button>
          </div>
        )}

        {/* Phase: result — final outcome */}
        {phase === "result" && (
          <div className="space-y-4">
            <div
              className={`-mx-6 -mt-2 px-6 py-4 text-center rounded-none ${
                finalCorrect ? "bg-green-100" : "bg-blue-50"
              }`}
            >
              <p
                className={`font-bold text-xl ${
                  finalCorrect ? "text-green-700" : "text-blue-700"
                }`}
              >
                {finalCorrect
                  ? gotItSecondTry
                    ? "Got it on the second try!"
                    : "Nice work!"
                  : "Keep practicing!"}
              </p>
            </div>

            {!finalCorrect && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Your answer
                  </p>
                  <p className="text-lg text-gray-600">{userInput}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Correct answer
                  </p>
                  <p className="text-lg font-semibold text-green-700">
                    {card.bulgarianSentence}
                  </p>
                </div>
              </div>
            )}

            {finalCorrect && gotItSecondTry && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  The sentence
                </p>
                <p className="text-lg font-semibold text-green-700">
                  {card.bulgarianSentence}
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold text-lg hover:bg-gray-900 transition-colors"
            >
              Next Card
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">
          {card.topic}
        </span>
      </div>
    </div>
  );
}

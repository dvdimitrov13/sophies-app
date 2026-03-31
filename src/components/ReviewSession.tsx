"use client";

import { useState, useRef } from "react";
import { Flashcard, ReviewDirection, CardScore } from "@/lib/types";
import {
  getCardsForReview,
  reviewCard,
  chooseDirection,
} from "@/lib/spaced-repetition";
import { calculateCardScore, scoreToQuality } from "@/lib/scoring";
import ClickableWords from "./ClickableWords";

type Phase = "answering" | "hint" | "retrying" | "result";

interface Props {
  cards: Flashcard[];
  onUpdateCard: (card: Flashcard) => void;
  onSessionComplete: (points: number) => void;
}

export default function ReviewSession({
  cards,
  onUpdateCard,
  onSessionComplete,
}: Props) {
  const snapshotRef = useRef<Flashcard[] | null>(null);
  const directionsRef = useRef<ReviewDirection[]>([]);
  if (snapshotRef.current === null) {
    const due = getCardsForReview(cards);
    snapshotRef.current = due;
    directionsRef.current = due.map((c) => chooseDirection(c));
  }
  const dueCards = snapshotRef.current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [firstAttempt, setFirstAttempt] = useState("");
  const [sessionDone, setSessionDone] = useState(false);
  const [finalCorrect, setFinalCorrect] = useState(false);
  const [gotItSecondTry, setGotItSecondTry] = useState(false);
  const [wordLookups, setWordLookups] = useState(0);
  const [lastCardScore, setLastCardScore] = useState<CardScore | null>(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [cardScores, setCardScores] = useState<CardScore[]>([]);
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
        <div className="text-4xl font-bold text-indigo-600 mt-4">
          {sessionPoints} pts
        </div>
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
        {cardScores.length > 0 && (
          <div className="mt-6 space-y-1 text-sm text-gray-500">
            {cardScores.map((cs, i) => (
              <div key={i} className="flex justify-between max-w-xs mx-auto">
                <span>
                  {dueCards[i]?.englishWord}{" "}
                  <span className="text-xs text-gray-400">
                    {cs.direction === "en-to-bg" ? "EN→BG" : "BG→EN"}
                  </span>
                </span>
                <span className="font-medium text-gray-700">
                  {cs.totalPoints} pts
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            setCurrentIndex(0);
            setSessionDone(false);
            setScore({ correct: 0, incorrect: 0 });
            setSessionPoints(0);
            setCardScores([]);
            snapshotRef.current = null;
            directionsRef.current = [];
          }}
          className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Review Again
        </button>
      </div>
    );
  }

  const card = dueCards[currentIndex];
  const direction = directionsRef.current[currentIndex];
  const isEnToBg = direction === "en-to-bg";

  // Direction-dependent fields
  const promptWord = isEnToBg ? card.englishWord : card.bulgarianWord;
  const promptSentence = isEnToBg
    ? card.englishSentence
    : card.bulgarianSentence;
  const expectedAnswer = isEnToBg
    ? card.bulgarianSentence
    : card.englishSentence;
  const promptLang = isEnToBg ? "English" : "Български";
  const targetLang = isEnToBg ? "Bulgarian" : "English";
  const sentenceLang: "bg" | "en" = isEnToBg ? "en" : "bg";

  function normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[.,!?;:'"—–\-()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function finishCard(
    firstTryCorrect: boolean,
    secondTryCorrect: boolean
  ) {
    const cardScore = calculateCardScore(
      firstTryCorrect,
      secondTryCorrect,
      usedHint,
      wordLookups,
      direction
    );
    const quality = scoreToQuality(cardScore);
    const updated = reviewCard(card, quality);
    onUpdateCard(updated);

    setLastCardScore(cardScore);
    setSessionPoints((prev) => prev + cardScore.totalPoints);
    setCardScores((prev) => [...prev, cardScore]);

    const isCorrect = firstTryCorrect || secondTryCorrect;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));
  }

  function handleFirstCheck() {
    const correct = normalize(userInput) === normalize(expectedAnswer);
    if (correct) {
      setFinalCorrect(true);
      setGotItSecondTry(false);
      setPhase("result");
      finishCard(true, false);
    } else {
      setFirstAttempt(userInput);
      setPhase("hint");
    }
  }

  async function handleGetHint() {
    setHintLoading(true);
    setUsedHint(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAttempt: firstAttempt,
          correctSentence: expectedAnswer,
          englishSentence: isEnToBg
            ? card.englishSentence
            : card.bulgarianSentence,
          englishWord: isEnToBg ? card.englishWord : card.bulgarianWord,
          direction,
        }),
      });
      const data = await res.json();
      setHint(
        data.hint ||
          "Try thinking about each word in the sentence one at a time."
      );
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
    const correct = normalize(userInput) === normalize(expectedAnswer);
    if (correct) {
      setFinalCorrect(true);
      setGotItSecondTry(true);
    } else {
      setFinalCorrect(false);
      setGotItSecondTry(false);
    }
    finishCard(false, correct);
    setPhase("result");
  }

  function handleNext() {
    setPhase("answering");
    setUserInput("");
    setHint("");
    setUsedHint(false);
    setFirstAttempt("");
    setFinalCorrect(false);
    setGotItSecondTry(false);
    setWordLookups(0);
    setLastCardScore(null);
    if (currentIndex + 1 >= dueCards.length) {
      setSessionDone(true);
      onSessionComplete(sessionPoints);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-600">
            {sessionPoints} pts
          </span>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>
      </div>

      <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 shadow-sm space-y-4">
        {/* Direction badge + prompt */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isEnToBg
                ? "bg-purple-100 text-purple-700"
                : "bg-teal-100 text-teal-700"
            }`}
          >
            {isEnToBg ? "EN → BG" : "BG → EN"}
          </span>
          {wordLookups > 0 && (
            <span className="text-xs text-orange-500">
              -{wordLookups * 10} pts (lookups)
            </span>
          )}
        </div>

        <div>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            {promptLang}
          </span>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            {promptWord}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Translate this sentence to {targetLang}
          </span>
          <div className="text-lg text-indigo-700 font-medium mt-1">
            <ClickableWords
              sentence={promptSentence}
              fromLanguage={sentenceLang}
              targetWord={promptWord}
              onLookup={() => setWordLookups((n) => n + 1)}
              disabled={phase === "result"}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Tap a word for its translation (-10 pts each)
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
              placeholder={`Type the full ${targetLang} sentence...`}
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

        {/* Phase: hint */}
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

        {/* Phase: retrying */}
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

        {/* Phase: result */}
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
              {lastCardScore && (
                <p
                  className={`text-sm mt-1 font-medium ${
                    finalCorrect ? "text-green-600" : "text-blue-600"
                  }`}
                >
                  +{lastCardScore.totalPoints} pts
                  {lastCardScore.lookupPenalty > 0 &&
                    ` (−${lastCardScore.lookupPenalty} from lookups)`}
                </p>
              )}
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
                    {expectedAnswer}
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
                  {expectedAnswer}
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

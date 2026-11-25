"use client";

import { useRef, useState } from "react";
import { Flashcard, ReviewDirection, CardScore, DirectionPref } from "@/lib/types";
import { reviewCard, chooseDirection } from "@/lib/spaced-repetition";
import { calculateCardScore, scoreToGrade } from "@/lib/scoring";
import ClickableWords from "./ClickableWords";
import BulgarianKeys from "./BulgarianKeys";

type Phase = "answering" | "hint" | "retrying" | "result";

export type SessionMode = "review" | "test";

interface Props {
  /** Cards for this session, in order. Captured when the session starts. */
  queue: Flashcard[];
  /** Review reschedules cards with FSRS; a test only scores them. */
  mode: SessionMode;
  title: string;
  directionPref: DirectionPref;
  onDirectionChange: (pref: DirectionPref) => void;
  onUpdateCard?: (card: Flashcard) => void;
  /** Called after each answer (used for the daily streak). */
  onAnswered: () => void;
  onSessionComplete: (points: number) => void;
  onRestart: () => void;
  restartLabel: string;
  onExit?: () => void;
  empty?: React.ReactNode;
}

interface Answer {
  card: Flashcard;
  score: CardScore;
  correct: boolean;
}

const DIRECTION_OPTIONS: { value: DirectionPref; label: string; title: string }[] = [
  { value: "en-to-bg", label: "EN → BG", title: "Always translate English into Bulgarian" },
  { value: "bg-to-en", label: "BG → EN", title: "Always translate Bulgarian into English" },
  { value: "mixed", label: "Mixed", title: "Mix both; well-known words lean EN → BG" },
];

function DirectionSwitch({
  value,
  onChange,
}: {
  value: DirectionPref;
  onChange: (pref: DirectionPref) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Question direction" className="flex rounded-full bg-ink/[0.05] p-0.5 text-xs">
      {DIRECTION_OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 font-semibold transition-colors sm:px-2.5 sm:py-1 ${
            value === o.value ? "bg-night text-lime-300" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,!?;:'"—–\-()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ReviewSession({
  queue,
  mode,
  title,
  directionPref,
  onDirectionChange,
  onUpdateCard,
  onAnswered,
  onSessionComplete,
  onRestart,
  restartLabel,
  onExit,
  empty,
}: Props) {
  const [cards] = useState(queue);
  // Mixed-mode directions, picked once per session so they don't reshuffle.
  const [mixedDirections] = useState<ReviewDirection[]>(() =>
    queue.map((c) => chooseDirection(c))
  );

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
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Once you start on a card its direction stays put; a new setting applies
  // from the next card.
  const [lockedDirection, setLockedDirection] = useState<ReviewDirection | null>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const sessionPoints = answers.reduce((n, a) => n + a.score.totalPoints, 0);

  if (cards.length === 0) {
    return <>{empty}</>;
  }

  if (sessionDone) {
    const correct = answers.filter((a) => a.correct).length;
    const percent = Math.round((correct / answers.length) * 100);
    return (
      <div className="mx-auto max-w-lg">
        <div className="surface overflow-hidden">
          <div className="bg-night px-6 pt-8 pb-7 text-center text-white">
            <p className="eyebrow text-lime-300/80">
              {mode === "test" ? "Test complete" : "Session complete"}
            </p>
            <p className="mt-2 text-6xl font-bold tracking-tight text-lime-300">
              {mode === "test" ? `${percent}%` : `+${sessionPoints}`}
            </p>
            <p className="mt-1 text-white/60">
              {mode === "test"
                ? `${correct} of ${answers.length} right · +${sessionPoints} pts`
                : "points earned"}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-ink/5 border-b border-ink/5">
            <div className="py-4 text-center">
              <div className="text-2xl font-bold text-lime-600 dark:text-lime-400">{correct}</div>
              <div className="text-sm text-muted">Correct</div>
            </div>
            <div className="py-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {answers.length - correct}
              </div>
              <div className="text-sm text-muted">Needs practice</div>
            </div>
          </div>
          <ul className="max-h-72 divide-y divide-ink/5 overflow-y-auto px-6">
            {answers.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${
                      a.correct ? "bg-lime-300 text-on-lime" : "bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"
                    }`}
                  >
                    {a.correct ? "✓" : "✗"}
                  </span>
                  <span className="font-medium">{a.card.englishWord}</span>
                  <span className="text-muted">{a.card.bulgarianWord}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {a.score.totalPoints} pts
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 p-4">
            {onExit && (
              <button onClick={onExit} className="btn-soft flex-1">
                Done
              </button>
            )}
            <button onClick={onRestart} className="btn-primary flex-1">
              {restartLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const direction: ReviewDirection =
    lockedDirection ??
    (directionPref === "mixed" ? mixedDirections[currentIndex] : directionPref);

  function lockDirection() {
    if (!lockedDirection) setLockedDirection(direction);
  }
  const isEnToBg = direction === "en-to-bg";

  const promptWord = isEnToBg ? card.englishWord : card.bulgarianWord;
  const promptSentence = isEnToBg ? card.englishSentence : card.bulgarianSentence;
  const expectedAnswer = isEnToBg ? card.bulgarianSentence : card.englishSentence;
  const targetLang = isEnToBg ? "Bulgarian" : "English";
  const sentenceLang: "bg" | "en" = isEnToBg ? "en" : "bg";

  function finishCard(firstTryCorrect: boolean, secondTryCorrect: boolean) {
    const cardScore = calculateCardScore(
      firstTryCorrect,
      secondTryCorrect,
      usedHint,
      wordLookups,
      direction
    );

    if (mode === "review" && onUpdateCard) {
      reviewCard(card, scoreToGrade(cardScore)).then(onUpdateCard);
    }
    onAnswered();

    setLastCardScore(cardScore);
    setAnswers((prev) => [
      ...prev,
      { card, score: cardScore, correct: firstTryCorrect || secondTryCorrect },
    ]);
  }

  function handleFirstCheck() {
    if (normalize(userInput) === normalize(expectedAnswer)) {
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
          englishSentence: isEnToBg ? card.englishSentence : card.bulgarianSentence,
          englishWord: isEnToBg ? card.englishWord : card.bulgarianWord,
          direction,
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
    const correct = normalize(userInput) === normalize(expectedAnswer);
    setFinalCorrect(correct);
    setGotItSecondTry(correct);
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
    setLockedDirection(null);
    if (currentIndex + 1 >= cards.length) {
      setSessionDone(true);
      onSessionComplete(sessionPoints);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  /** Types a letter at the cursor (or over the selection) in the answer box. */
  function insertLetter(letter: string) {
    const box = answerRef.current;
    const start = box?.selectionStart ?? userInput.length;
    const end = box?.selectionEnd ?? userInput.length;
    lockDirection();
    setUserInput(userInput.slice(0, start) + letter + userInput.slice(end));
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + letter.length, start + letter.length);
    });
  }

  const answerBox = (onSubmit: () => void, placeholder: string) => (
    <>
      <textarea
        ref={answerRef}
        value={userInput}
        onChange={(e) => {
          lockDirection();
          setUserInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (userInput.trim()) onSubmit();
          }
        }}
        placeholder={placeholder}
        className="field resize-none"
        rows={2}
        autoFocus
      />
      {isEnToBg && <BulgarianKeys onInsert={insertLetter} />}
      <button
        onClick={onSubmit}
        disabled={!userInput.trim()}
        className="btn-primary w-full text-lg"
      >
        Check
      </button>
    </>
  );

  const progress = (currentIndex + (phase === "result" ? 1 : 0)) / cards.length;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              aria-label="Leave test"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-lg hover:bg-ink/[0.08]"
            >
              ←
            </button>
          )}
          <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="chip bg-lime-300/60 text-on-lime dark:bg-lime-400/20 dark:text-lime-300">{sessionPoints} pts</span>
          <span className="text-sm font-medium text-muted tabular-nums">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">Ask me</span>
        <DirectionSwitch value={directionPref} onChange={onDirectionChange} />
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <div
          className="h-full rounded-full bg-lime-400 transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="surface space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="chip bg-night text-xs text-lime-300">
            {isEnToBg ? "EN → BG" : "BG → EN"}
          </span>
          <span className="flex items-center gap-2">
            {wordLookups > 0 && (
              <span className="text-xs font-medium text-orange-500">
                −{wordLookups * 10} pts
              </span>
            )}
            <span className="chip bg-ink/[0.04] text-xs text-ink-soft">{card.topic}</span>
          </span>
        </div>

        <div>
          <p className="eyebrow">{isEnToBg ? "English" : "Български"}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{promptWord}</p>
        </div>

        <div className="rounded-2xl bg-canvas p-4">
          <p className="eyebrow">Translate to {targetLang}</p>
          <div className="mt-1.5 text-xl font-medium text-ink">
            <ClickableWords
              key={currentIndex}
              sentence={promptSentence}
              fromLanguage={sentenceLang}
              targetWord={promptWord}
              onLookup={() => {
                lockDirection();
                setWordLookups((n) => n + 1);
              }}
              disabled={phase === "result"}
            />
          </div>
          <p className="mt-2 text-xs text-muted">Tap a word to see it (−10 pts each)</p>
        </div>

        {phase === "answering" &&
          answerBox(handleFirstCheck, `Type the full ${targetLang} sentence…`)}

        {phase === "hint" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-400/10 text-center">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">Almost there!</p>
            </div>
            <div>
              <p className="eyebrow mb-1">Your attempt</p>
              <p className="text-lg text-ink-soft">{firstAttempt}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGetHint}
                disabled={hintLoading}
                className="btn flex-1 bg-amber-400 text-on-lime hover:bg-amber-300"
              >
                {hintLoading ? "Thinking…" : "Get a hint"}
              </button>
              <button onClick={handleTryAgain} className="btn-soft flex-1">
                Try again
              </button>
            </div>
          </div>
        )}

        {phase === "retrying" && (
          <div className="space-y-4">
            {hint ? (
              <div className="rounded-2xl border border-lime-200 bg-lime-50 dark:border-lime-400/20 dark:bg-lime-400/10 p-4">
                <p className="eyebrow mb-1 text-lime-700 dark:text-lime-300">Hint</p>
                <p className="text-ink-soft">{hint}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-400/10 text-center">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">Give it another shot!</p>
              </div>
            )}
            {answerBox(handleSecondCheck, "Try again…")}
          </div>
        )}

        {phase === "result" && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl px-4 py-4 text-center ${
                finalCorrect ? "bg-lime-300" : "bg-orange-50 dark:bg-orange-400/10"
              }`}
            >
              <p className={`text-xl font-bold ${finalCorrect ? "text-on-lime" : "text-orange-700 dark:text-orange-300"}`}>
                {finalCorrect
                  ? gotItSecondTry
                    ? "Got it on the second try!"
                    : "Nice work!"
                  : "Keep practicing!"}
              </p>
              {lastCardScore && (
                <p
                  className={`mt-0.5 text-sm font-semibold ${
                    finalCorrect ? "text-on-lime/70" : "text-orange-600 dark:text-orange-300"
                  }`}
                >
                  +{lastCardScore.totalPoints} pts
                  {lastCardScore.lookupPenalty > 0 &&
                    ` (−${lastCardScore.lookupPenalty} from lookups)`}
                </p>
              )}
            </div>

            {!finalCorrect && (
              <div className="space-y-3">
                <div>
                  <p className="eyebrow mb-1">Your answer</p>
                  <p className="text-lg text-ink-soft line-through decoration-orange-400/60">
                    {userInput}
                  </p>
                </div>
                <div>
                  <p className="eyebrow mb-1">Correct answer</p>
                  <p className="text-lg font-semibold text-lime-700 dark:text-lime-300">{expectedAnswer}</p>
                </div>
              </div>
            )}

            {finalCorrect && gotItSecondTry && (
              <div>
                <p className="eyebrow mb-1">The sentence</p>
                <p className="text-lg font-semibold text-lime-700 dark:text-lime-300">{expectedAnswer}</p>
              </div>
            )}

            <button onClick={handleNext} autoFocus className="btn-dark w-full text-lg">
              {currentIndex + 1 >= cards.length ? "See results" : "Next card"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

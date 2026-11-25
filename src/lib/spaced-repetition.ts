import { DefaultScheduler, Rating, type Grade } from "ts-fsrs";
import type { Flashcard, FsrsState, ReviewDirection } from "./types";

/**
 * Scheduling with FSRS (Free Spaced Repetition Scheduler), the algorithm Anki
 * uses. Each card keeps a memory state (stability, difficulty); every answer
 * updates it and picks the next due date so recall stays near 90%.
 */

export { Rating };
export type { Grade };

const DAY_MS = 24 * 60 * 60 * 1000;

// Pinned to FSRS-7: saved memory states belong to the model that made them.
type Scheduler = DefaultScheduler<"FSRS-7">;
type SchedulerCard = ReturnType<Scheduler["newCard"]>;

let schedulerPromise: Promise<Scheduler> | null = null;
function getScheduler(): Promise<Scheduler> {
  schedulerPromise ??= DefaultScheduler<"FSRS-7">({
    version: "FSRS-7",
    desiredRetention: 0.9,
    enableFuzz: true,
  });
  return schedulerPromise;
}

function toStored(c: SchedulerCard): FsrsState {
  return {
    stability: c.stability,
    stabilityFast: c.stabilityFast,
    difficulty: c.difficulty,
    state: c.state,
    scheduleStatus: c.scheduleStatus,
    dueAt: new Date(c.dueAt).getTime(),
    lastReviewAt: c.lastReviewAt ? new Date(c.lastReviewAt).getTime() : null,
    reps: c.reps,
    lapses: c.lapses,
    scheduledDays: c.scheduledDays,
    learningStep: c.learningStep,
  };
}

function fromStored(base: SchedulerCard, s: FsrsState): SchedulerCard {
  return {
    ...base,
    ...s,
    dueAt: new Date(s.dueAt),
    lastReviewAt: s.lastReviewAt === null ? null : new Date(s.lastReviewAt),
  } as SchedulerCard;
}

/**
 * Builds a memory state for a card reviewed only with the old SM-2 code, so
 * its progress carries over: the SM-2 interval becomes the stability and the
 * ease factor (1.3 hard … 2.5+ easy) maps onto FSRS difficulty (10 … 1).
 */
export function migrateFromSm2(card: Flashcard): FsrsState | null {
  if (card.repetitions === 0 || card.lastReviewDate === null) return null;
  const difficulty = Math.min(10, Math.max(1, 5 - (card.easeFactor - 2.5) * 4));
  return {
    stability: Math.max(1, card.interval),
    stabilityFast: Math.max(1, card.interval),
    difficulty,
    state: 2,
    scheduleStatus: "review",
    dueAt: card.nextReviewDate,
    lastReviewAt: card.lastReviewDate,
    reps: card.repetitions,
    lapses: 0,
    scheduledDays: card.interval,
    learningStep: 0,
  };
}

/** The card's FSRS state, migrating SM-2 progress when that is newer. */
function currentState(card: Flashcard): FsrsState | null {
  const stored = card.fsrs;
  // A review made by older code updates lastReviewDate but not `fsrs`.
  const sm2IsNewer =
    card.lastReviewDate !== null &&
    (stored?.lastReviewAt ?? 0) < card.lastReviewDate;
  if (stored && !sm2IsNewer) return stored;
  return migrateFromSm2(card) ?? stored ?? null;
}

export async function reviewCard(
  card: Flashcard,
  grade: Grade,
  now = new Date()
): Promise<Flashcard> {
  const scheduler = await getScheduler();
  const base = scheduler.newCard({ now });
  const state = currentState(card);
  const input = state ? fromStored(base, state) : base;

  const { card: next } = scheduler.review({ card: input, now, grade });
  const fsrs = toStored(next);

  return {
    ...card,
    fsrs,
    interval: Math.max(0, Math.round(fsrs.scheduledDays)),
    repetitions: fsrs.reps,
    nextReviewDate: fsrs.dueAt,
    lastReviewDate: now.getTime(),
  };
}

export function getCardsForReview(cards: Flashcard[]): Flashcard[] {
  const now = Date.now();
  return cards
    .filter((c) => c.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

export function stabilityOf(card: Flashcard): number {
  return currentState(card)?.stability ?? 0;
}

export function chooseDirection(card: Flashcard): ReviewDirection {
  // Better-remembered cards more often get the harder direction (EN → BG).
  const prob = Math.min(0.85, Math.max(0.3, 0.3 + stabilityOf(card) / 30));
  return Math.random() < prob ? "en-to-bg" : "bg-to-en";
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createCard(
  englishWord: string,
  bulgarianWord: string,
  bulgarianSentence: string,
  englishSentence: string,
  topic: string,
  availableFrom = Date.now()
): Flashcard {
  return {
    id: crypto.randomUUID(),
    englishWord: englishWord.toLowerCase().trim(),
    bulgarianWord,
    bulgarianSentence,
    englishSentence,
    topic,
    createdAt: Date.now(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: availableFrom,
    lastReviewDate: null,
  };
}

export { DAY_MS };

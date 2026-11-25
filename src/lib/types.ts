/**
 * FSRS memory state for a card, stored alongside it in MongoDB.
 * Times are epoch milliseconds so the card survives a JSON round trip.
 */
export interface FsrsState {
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number; // 0 new, 1 learning, 2 review, 3 relearning
  scheduleStatus: string;
  dueAt: number;
  lastReviewAt: number | null;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
}

export interface Flashcard {
  id: string;
  englishWord: string;
  bulgarianWord: string;
  bulgarianSentence: string;
  englishSentence: string;
  topic: string;
  createdAt: number;
  // Scheduling. `fsrs` is the source of truth; the older SM-2 fields are kept
  // in sync so any deployment still running the old code keeps working.
  fsrs?: FsrsState;
  easeFactor: number;
  interval: number; // in days
  repetitions: number;
  nextReviewDate: number; // timestamp
  lastReviewDate: number | null;
}

export type Topic = string;

export type ReviewDirection = "en-to-bg" | "bg-to-en";

/** Which way cards are asked: a fixed direction, or mixed by how well a word is known. */
export type DirectionPref = "mixed" | ReviewDirection;

export function isDirectionPref(value: unknown): value is DirectionPref {
  return value === "mixed" || value === "en-to-bg" || value === "bg-to-en";
}

export interface CardScore {
  basePoints: number;
  lookupPenalty: number;
  totalPoints: number;
  direction: ReviewDirection;
}

export interface UserStats {
  totalScore: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD in the learner's own time zone
  directionPref: DirectionPref;
}

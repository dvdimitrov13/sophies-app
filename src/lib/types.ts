export interface Flashcard {
  id: string;
  englishWord: string;
  bulgarianWord: string;
  bulgarianSentence: string;
  englishSentence: string;
  topic: string;
  createdAt: number;
  // SM-2 spaced repetition fields
  easeFactor: number;
  interval: number; // in days
  repetitions: number;
  nextReviewDate: number; // timestamp
  lastReviewDate: number | null;
}

export interface ReviewResult {
  cardId: string;
  quality: number; // 0-5 scale
}

export type Topic = string;

export interface AppState {
  cards: Flashcard[];
  topics: Topic[];
}

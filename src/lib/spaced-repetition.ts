import { Flashcard, ReviewDirection } from "./types";

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0 = complete blackout, 5 = perfect recall
 * For this app: correct full sentence = 5, minor typos = 3, wrong = 0
 */
export function reviewCard(
  card: Flashcard,
  quality: number
): Flashcard {
  const now = Date.now();
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  const newEF =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, newEF);

  const nextReviewDate = now + interval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastReviewDate: now,
  };
}

export function getCardsForReview(cards: Flashcard[]): Flashcard[] {
  const now = Date.now();
  return cards
    .filter((c) => c.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

export function chooseDirection(card: Flashcard): ReviewDirection {
  // Higher ease = easier card = more likely to get the hard direction (en-to-bg)
  const prob = Math.min(0.85, Math.max(0.3, (card.easeFactor - 1.3) / 2.0));
  return Math.random() < prob ? "en-to-bg" : "bg-to-en";
}

export function createCard(
  englishWord: string,
  bulgarianWord: string,
  bulgarianSentence: string,
  englishSentence: string,
  topic: string
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
    nextReviewDate: Date.now(), // available immediately
    lastReviewDate: null,
  };
}

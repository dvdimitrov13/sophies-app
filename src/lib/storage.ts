import { Flashcard } from "./types";

const STORAGE_KEY = "sophies-flashcards";

export function loadCards(): Flashcard[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCards(cards: Flashcard[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function isDuplicate(cards: Flashcard[], englishWord: string): boolean {
  const normalized = englishWord.toLowerCase().trim();
  return cards.some((c) => c.englishWord === normalized);
}

export function getTopics(cards: Flashcard[]): string[] {
  const topics = new Set(cards.map((c) => c.topic));
  return Array.from(topics).sort();
}

export function getCardsByTopic(
  cards: Flashcard[],
  topic: string
): Flashcard[] {
  return cards.filter((c) => c.topic === topic);
}

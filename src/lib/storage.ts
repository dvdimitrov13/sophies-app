import { Flashcard } from "./types";

export async function loadCards(): Promise<Flashcard[]> {
  const res = await fetch("/api/cards");
  if (!res.ok) return [];
  return res.json();
}

export async function addCard(card: Flashcard): Promise<{ error?: string }> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  if (!res.ok) {
    const data = await res.json();
    return { error: data.error || "Failed to save card" };
  }
  return {};
}

export async function updateCard(card: Flashcard): Promise<void> {
  await fetch("/api/cards", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
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

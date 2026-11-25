import { DirectionPref, Flashcard, UserStats } from "./types";
import { localDateKey } from "./streak";

const EMPTY_STATS: UserStats = {
  totalScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  directionPref: "mixed",
};

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

/** Adds many cards at once; the server skips words already in the deck. */
export async function importCards(
  cards: Flashcard[]
): Promise<{ added: Flashcard[]; error?: string }> {
  const res = await fetch("/api/cards/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  const data = await res.json();
  if (!res.ok) return { added: [], error: data.error || "Import failed" };
  return { added: data.added };
}

export async function updateCard(card: Flashcard): Promise<void> {
  await fetch("/api/cards", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
}

async function putStats(body: object): Promise<UserStats | null> {
  const res = await fetch("/api/stats", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function loadStats(): Promise<UserStats> {
  const res = await fetch("/api/stats");
  if (!res.ok) return EMPTY_STATS;
  return { ...EMPTY_STATS, ...(await res.json()) };
}

export function addToScore(points: number): Promise<UserStats | null> {
  return putStats({ addPoints: points });
}

/** Marks today as a study day for the streak. */
export function recordStudyDay(): Promise<UserStats | null> {
  return putStats({ studiedOn: localDateKey() });
}

export function saveDirectionPref(directionPref: DirectionPref): Promise<UserStats | null> {
  return putStats({ directionPref });
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

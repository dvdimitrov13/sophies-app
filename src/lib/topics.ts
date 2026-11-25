/** A topic's display details. Topic names are Bulgarian (e.g. "храна"). */
export interface TopicMeta {
  name: string;
  english: string;
  emoji: string;
}

/** The built-in topics (Bulgarian keys). */
export const BUILT_IN_TOPICS: Record<string, { emoji: string; english: string }> = {
  приветствия: { emoji: "👋", english: "Greetings" },
  семейство: { emoji: "👨‍👩‍👧", english: "Family" },
  храна: { emoji: "🍅", english: "Food" },
  цветове: { emoji: "🎨", english: "Colors" },
  числа: { emoji: "🔢", english: "Numbers" },
  дрехи: { emoji: "👕", english: "Clothing" },
  тяло: { emoji: "🖐️", english: "Body" },
  дом: { emoji: "🏠", english: "Home" },
  спалня: { emoji: "🛏️", english: "Bedroom" },
  кухня: { emoji: "🍳", english: "Kitchen" },
  баня: { emoji: "🛁", english: "Bathroom" },
  животни: { emoji: "🐾", english: "Animals" },
  природа: { emoji: "🌲", english: "Nature" },
  време: { emoji: "☀️", english: "Weather" },
  професии: { emoji: "💼", english: "Professions" },
  транспорт: { emoji: "🚌", english: "Transport" },
  училище: { emoji: "📚", english: "School" },
  емоции: { emoji: "😊", english: "Emotions" },
  действия: { emoji: "🏃", english: "Actions" },
  "време-часове": { emoji: "⏰", english: "Time" },
  пазаруване: { emoji: "🛒", english: "Shopping" },
  здраве: { emoji: "💊", english: "Health" },
  спорт: { emoji: "⚽", english: "Sport" },
  технологии: { emoji: "💻", english: "Technology" },
  друго: { emoji: "✨", english: "Other" },
};

// Topics the generator created, loaded from the server when the app starts.
let customTopics: Record<string, { emoji: string; english: string }> = {};

export function setCustomTopics(topics: TopicMeta[]) {
  customTopics = Object.fromEntries(
    topics.map((t) => [t.name, { emoji: t.emoji, english: t.english }])
  );
}

export function topicInfo(topic: string): { emoji: string; english: string | null } {
  return BUILT_IN_TOPICS[topic] ?? customTopics[topic] ?? { emoji: "🏷️", english: null };
}

/** Normalises a topic name: lowercase, single spaces, no stray punctuation. */
export function cleanTopicName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").replace(/\s+/g, " ").trim();
}

/** Checks a proposed new topic before it is saved. */
export function validTopicMeta(value: unknown): TopicMeta | null {
  const t = value as Partial<TopicMeta>;
  if (!t || typeof t.name !== "string" || typeof t.english !== "string" || typeof t.emoji !== "string") {
    return null;
  }
  const name = cleanTopicName(t.name);
  const english = t.english.trim().slice(0, 30);
  const emoji = t.emoji.trim();
  if (!name || name.length > 30 || !/\p{Script=Cyrillic}/u.test(name)) return null;
  if (!english || !emoji || [...emoji].length > 4) return null;
  return { name, english, emoji };
}

/** "храна (Food)" lines for prompts: built-in topics plus the custom ones given. */
export function topicListForPrompt(custom: TopicMeta[]): string {
  const all = [
    ...Object.entries(BUILT_IN_TOPICS).map(([name, t]) => `${name} (${t.english})`),
    ...custom
      .filter((t) => !BUILT_IN_TOPICS[t.name])
      .map((t) => `${t.name} (${t.english})`),
  ];
  return all.join(", ");
}

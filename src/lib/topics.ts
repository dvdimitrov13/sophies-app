/** Display details for the topic names the app uses (Bulgarian keys). */
const TOPICS: Record<string, { emoji: string; english: string }> = {
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

export function topicInfo(topic: string): { emoji: string; english: string | null } {
  const info = TOPICS[topic];
  return info ?? { emoji: "🏷️", english: null };
}

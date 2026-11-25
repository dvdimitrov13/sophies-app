/**
 * Daily streaks. Days are YYYY-MM-DD strings in the learner's own time zone,
 * worked out in the browser, so "today" means her today wherever the server is.
 */

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** The day before a YYYY-MM-DD key. */
export function previousDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return prev.toISOString().slice(0, 10);
}

/** The streak after studying on `today`, given the last day studied. */
export function nextStreak(
  current: number,
  lastStudyDate: string | null,
  today: string
): number {
  if (lastStudyDate === today) return Math.max(1, current);
  if (lastStudyDate === previousDateKey(today)) return current + 1;
  return 1;
}

/** The streak to show: it lapses once a whole day has passed without study. */
export function liveStreak(
  current: number,
  lastStudyDate: string | null,
  today = localDateKey()
): number {
  if (lastStudyDate === today || lastStudyDate === previousDateKey(today)) {
    return current;
  }
  return 0;
}

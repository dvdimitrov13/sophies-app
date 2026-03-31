import { CardScore, ReviewDirection } from "./types";

export function calculateCardScore(
  firstTryCorrect: boolean,
  secondTryCorrect: boolean,
  usedHint: boolean,
  wordLookups: number,
  direction: ReviewDirection
): CardScore {
  let basePoints: number;

  if (firstTryCorrect) {
    basePoints = 100;
  } else if (secondTryCorrect && !usedHint) {
    basePoints = 60;
  } else if (secondTryCorrect && usedHint) {
    basePoints = 40;
  } else {
    basePoints = 0;
  }

  const lookupPenalty = wordLookups * 10;
  const totalPoints = Math.max(0, basePoints - lookupPenalty);

  return { basePoints, lookupPenalty, totalPoints, direction };
}

export function scoreToQuality(score: CardScore): number {
  const p = score.totalPoints;
  if (p >= 90) return 5;
  if (p >= 70) return 4;
  if (p >= 50) return 3;
  if (p >= 30) return 2;
  if (p >= 10) return 1;
  return 0;
}

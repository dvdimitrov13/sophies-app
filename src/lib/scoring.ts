import { CardScore, ReviewDirection } from "./types";
import { Rating, type Grade } from "./spaced-repetition";

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

/**
 * Maps an answer onto an FSRS grade, the way Anki's buttons would:
 * right first time with at most one lookup = Good, right but with a struggle
 * (second try, hint, or several lookups) = Hard, wrong = Again.
 */
export function scoreToGrade(score: CardScore): Grade {
  const p = score.totalPoints;
  if (p >= 90) return Rating.Good;
  if (p > 0) return Rating.Hard;
  return Rating.Again;
}

// ქულები და ვარსკვლავები — მხოლოდ მათემატიკისთვის. ფული აქ არასდროს იცვლება.
import type { Op, Progress } from '../core/types';
import { newAdaptive, updateAdaptive } from './math/generator';

export const SCORING = {
  firstTry: { points: 10, stars: 1 },
  secondTry: { points: 5, stars: 0 },
  afterSolution: { points: 2, stars: 0 },
  streakEvery: 5,
  streakBonus: { points: 20, stars: 2 },
};

export type Attempt = 1 | 2 | 3;

export interface Award { points: number; stars: number; streakBonus: boolean; levelUp: boolean }

/** attempt: 1 = პირველივე ცდა, 2 = მეორე ცდა, 3 = ამოხსნის ნახვის შემდეგ. */
export function recordAnswer(p: Progress, op: Op, attempt: Attempt): Award {
  const st = p.accuracy[op];
  st.attempts += 1;
  const base = attempt === 1 ? SCORING.firstTry : attempt === 2 ? SCORING.secondTry : SCORING.afterSolution;
  const award: Award = { points: base.points, stars: base.stars, streakBonus: false, levelUp: false };
  // ადაპტური სირთულე (ძველ შენახვებში შეიძლება არ იყოს)
  p.adaptive ??= { add: newAdaptive(), sub: newAdaptive(), mul: newAdaptive(), div: newAdaptive() };
  const before = p.adaptive[op].level;
  p.adaptive[op] = updateAdaptive(p.adaptive[op], attempt === 1);
  award.levelUp = p.adaptive[op].level > before;
  if (attempt === 1) {
    st.firstTry += 1;
    st.correct += 1;
    p.streak += 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    if (p.streak % SCORING.streakEvery === 0) {
      award.points += SCORING.streakBonus.points;
      award.stars += SCORING.streakBonus.stars;
      award.streakBonus = true;
    }
  } else {
    if (attempt === 2) st.correct += 1;
    p.streak = 0;
  }
  p.points += award.points;
  p.stars += award.stars;
  return award;
}

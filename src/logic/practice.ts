// ვარჯიში: კაფეს გარეთ, ერთი მოქმედების რამდენიმე ამოცანა (სუსტი მხარის გასამაგრებლად).
// ამოცანები იგივე გენერატორებიდანაა (კაფეს ამბები), ფული არ იცვლება — მხოლოდ ქულები და ვარსკვლავები.
import type { Grade, Op, Progress } from '../core/types';
import type { Problem } from './math/types';
import {
  allows, budgetProblem, chairsProblem, compareProblem, customersProblem, doublePattyProblem, fractionProblem,
  groupProblem, missingProblem, packsProblem, patternProblem, rint, shareProblem, stockLeftProblem,
} from './math/generator';
import { ADAPTIVE } from '../config/difficulty';

export const PRACTICE_SIZE = 5;
/** 5-დან 5 სწორი პირველივე ცდით — ბონუსი. */
export const PRACTICE_BONUS_STARS = 2;

const ITEMS = ['ფუნთუშა', 'კოტლეტი', 'ყველი', 'წვენი'];

/** ერთი ამოცანა მოცემული მოქმედებით (op ყოველთვის ემთხვევა). */
export function practiceProblem(op: Op, grade: Grade, level = ADAPTIVE.start, rnd: () => number = Math.random): Problem | null {
  if (!allows(grade, op)) return null;
  const makers: Record<Op, (() => Problem | null)[]> = {
    add: [() => customersProblem(grade, level, rnd), () => patternProblem(grade, level, rnd), () => doublePattyProblem(grade, level, rnd)],
    sub: [() => stockLeftProblem(grade, level, rnd), () => missingProblem(grade, level, rnd), () => compareProblem(grade, level, rnd),
      () => { const a = rint(10, Math.max(12, Math.round(100 * (grade === 1 ? 0.2 : grade === 2 ? 1 : grade === 3 ? 8 : 60) * ADAPTIVE.range[level])), rnd); return budgetProblem(a, rint(1, a - 1, rnd), grade, rnd); }],
    mul: [() => chairsProblem(grade, level, rnd), () => doublePattyProblem(grade, level, rnd),
      () => packsProblem(rint(2, grade === 2 ? 5 : 9, rnd), grade === 2 ? [2, 5, 10][rint(0, 2, rnd)] : rint(2, 9 + level, rnd), ITEMS[rint(0, ITEMS.length - 1, rnd)], grade, rnd)],
    div: [() => groupProblem(grade, level, rnd), () => shareProblem(rint(2, 12, rnd) * [2, 3, 4, 5][rint(0, grade === 2 ? 0 : 3, rnd)], grade, rnd),
      () => fractionProblem(grade, level, rnd)],
  };
  for (let tries = 0; tries < 30; tries++) {
    const list = makers[op];
    const pr = list[Math.floor(rnd() * list.length)]();
    if (pr && pr.op === op) return pr;
  }
  return null;
}

/** ვარჯიშის ნაკრები; ზედიზედ ერთნაირი სახეობა არ მეორდება, თუ შესაძლებელია. */
export function practiceSet(op: Op, grade: Grade, level = ADAPTIVE.start, n = PRACTICE_SIZE, rnd: () => number = Math.random): Problem[] {
  const out: Problem[] = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const pr = practiceProblem(op, grade, level, rnd);
    if (!pr) break;
    if (out.length && out.at(-1)!.kind === pr.kind && i < n * 3) continue;
    out.push(pr);
  }
  return out;
}

/** რომელი მოქმედებაა ყველაზე სუსტი (პირველივე ცდის % ყველაზე დაბალი; ცოტა ცდაზე — ჯერ ნავარჯიშები არ არის). */
export function weakestOp(p: Pick<Progress, 'grade' | 'accuracy'>): Op {
  const ops = (['add', 'sub', 'mul', 'div'] as Op[]).filter((op) => allows(p.grade, op));
  const a = (op: Op) => p.accuracy[op];
  // ცოტა ნავარჯიშები (<3 ცდა) — პირველ რიგში; შემდეგ სიზუსტე (5%-იანი ბიჯით); თანაბარზე — ნაკლებად ნავარჯიშები
  const pct = (op: Op) => (a(op).attempts < 3 ? -1 : Math.floor((a(op).firstTry / a(op).attempts) * 20) / 20);
  return [...ops].sort((x, y) => pct(x) - pct(y) || a(x).attempts - a(y).attempts)[0];
}

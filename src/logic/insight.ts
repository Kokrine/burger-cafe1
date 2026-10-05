// მასწავლებლისთვის: სასწავლო დასკვნები მოსწავლის მონაცემებიდან (წმინდა ფუნქციები).
import type { Op } from '../core/types';

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

/** ყველაზე სუსტი მოქმედება (მინ. 5 ამოცანა, < 70% პირველივე ცდით). */
export function weakestOp(acc: Record<Op, { attempts: number; firstTry: number }>): { op: Op; pct: number } | null {
  let worst: { op: Op; pct: number } | null = null;
  for (const op of OPS) {
    const a = acc[op];
    if (!a || a.attempts < 5) continue;
    const pct = Math.round((a.firstTry / a.attempts) * 100);
    if (pct < 70 && (!worst || pct < worst.pct)) worst = { op, pct };
  }
  return worst;
}

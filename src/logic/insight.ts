// მასწავლებლისთვის: სასწავლო დასკვნები მოსწავლის მონაცემებიდან (წმინდა ფუნქციები).
import type { Op } from '../core/types';

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

type Acc = Record<Op, { attempts: number; firstTry: number }>;

export interface ClassInsight {
  total: number;
  active7: number;                       // აქტიური ბოლო 7 დღეში
  avgDay: number;                        // საშუალო თამაშის დღე
  accuracy: Acc;                         // ჯამური (კლასის) სიზუსტე
  weak: { op: Op; pct: number } | null;  // კლასის სუსტი მოქმედება
  attention: { id: string; nickname: string; op: Op; pct: number }[]; // ვისაც დახმარება სჭირდება
}

/** მასწავლებლის პანელის „კლასის სურათი" მოსწავლეების მწკრივებიდან. */
export function classInsight(rows: { id: string; nickname: string; day: number; accuracy: Acc; lastActive: string | null }[], now = Date.now()): ClassInsight {
  const accuracy = Object.fromEntries(OPS.map((op) => [op, { attempts: 0, firstTry: 0 }])) as Acc;
  const attention: ClassInsight['attention'] = [];
  let active7 = 0;
  for (const r of rows) {
    for (const op of OPS) {
      accuracy[op].attempts += r.accuracy[op]?.attempts ?? 0;
      accuracy[op].firstTry += r.accuracy[op]?.firstTry ?? 0;
    }
    if (r.lastActive && now - new Date(r.lastActive).getTime() < 7 * 86_400_000) active7 += 1;
    const w = weakestOp(r.accuracy);
    if (w) attention.push({ id: r.id, nickname: r.nickname, ...w });
  }
  attention.sort((a, b) => a.pct - b.pct);
  const avgDay = rows.length ? Math.round((rows.reduce((a, r) => a + r.day, 0) / rows.length) * 10) / 10 : 0;
  return { total: rows.length, active7, avgDay, accuracy, weak: weakestOp(accuracy), attention };
}

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

import { describe, expect, it } from 'vitest';
import type { Grade, Op } from '../core/types';
import { DIFFICULTY } from '../config/difficulty';
import { newProgress } from '../core/store';
import { allows } from './math/generator';
import { PRACTICE_SIZE, practiceSet, weakestOp } from './practice';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

describe('ვარჯიში', () => {
  it('ყველა კლასსა და დონეზე: სწორი მოქმედება, მთელი პასუხი, კლასის ფარგლებში', () => {
    for (let s = 1; s <= 40; s++) for (const g of [1, 2, 3, 4] as Grade[]) for (const op of OPS) for (const lv of [0, 2, 4]) {
      const set = practiceSet(op, g, lv, PRACTICE_SIZE, seeded(s * 7 + lv));
      if (!allows(g, op)) { expect(set).toEqual([]); continue; }
      expect(set.length, `g${g} ${op}`).toBe(PRACTICE_SIZE);
      for (const p of set) {
        expect(p.op).toBe(op);
        expect(Number.isInteger(p.answer)).toBe(true);
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer, `${p.kind} g${g}`).toBeLessThanOrEqual(DIFFICULTY[g].max);
        expect(p.steps.at(-1)!.value).toBe(p.answer);
        if (g === 1) expect(p.input).toBe('choice');
      }
    }
  });
  it('სუსტი მოქმედება: ჯერ ნაკლებად ნავარჯიშები, მერე ყველაზე დაბალი %', () => {
    const p = newProgress(3);
    for (const op of OPS) p.accuracy[op] = { attempts: 10, firstTry: 9, correct: 10 };
    p.accuracy.div = { attempts: 10, firstTry: 4, correct: 8 };
    expect(weakestOp(p)).toBe('div');
    p.accuracy.mul = { attempts: 1, firstTry: 1, correct: 1 };
    expect(weakestOp(p)).toBe('mul');
    expect(['add', 'sub']).toContain(weakestOp(newProgress(1)));
  });
});

describe('ვარჯიშის რეკომენდაცია ყველა 100%-ზე', () => {
  it('თანაბარ სიზუსტეზე — ყველაზე ნაკლებად ნავარჯიშები', () => {
    const p = newProgress(4);
    p.accuracy = { add: { attempts: 26, firstTry: 26, correct: 26 }, sub: { attempts: 88, firstTry: 88, correct: 88 }, mul: { attempts: 25, firstTry: 25, correct: 25 }, div: { attempts: 4, firstTry: 4, correct: 4 } };
    expect(weakestOp(p)).toBe('div');
  });
});

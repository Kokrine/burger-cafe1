import { describe, expect, it } from 'vitest';
import { classInsight, weakestOp } from './insight';

const acc = (a: [number, number], s: [number, number], m: [number, number] = [0, 0], d: [number, number] = [0, 0]) => ({
  add: { attempts: a[0], firstTry: a[1] }, sub: { attempts: s[0], firstTry: s[1] },
  mul: { attempts: m[0], firstTry: m[1] }, div: { attempts: d[0], firstTry: d[1] },
});

describe('სუსტი მოქმედება', () => {
  it('ყველაზე დაბალი სიზუსტე 5+ ამოცანიდან, 70%-ზე ქვემოთ', () => {
    expect(weakestOp(acc([10, 9], [10, 5], [6, 4]))).toEqual({ op: 'sub', pct: 50 });
  });
  it('ცოტა ამოცანა ან ყველაფერი კარგად — არაფერი', () => {
    expect(weakestOp(acc([3, 0], [4, 1]))).toBeNull();
    expect(weakestOp(acc([10, 8], [10, 9]))).toBeNull();
  });
});

describe('კლასის სურათი', () => {
  it('ჯამური სიზუსტე, აქტიურები, ვის სჭირდება დახმარება', () => {
    const now = Date.parse('2026-10-05T12:00:00Z');
    const row = (id: string, day: number, sub: [number, number], last: string | null) => ({
      id, nickname: id, day, lastActive: last,
      accuracy: { add: { attempts: 10, firstTry: 9 }, sub: { attempts: sub[0], firstTry: sub[1] }, mul: { attempts: 0, firstTry: 0 }, div: { attempts: 0, firstTry: 0 } },
    });
    const ins = classInsight([row('ა', 3, [10, 3], '2026-10-04T10:00:00Z'), row('ბ', 5, [10, 6], '2026-09-01T10:00:00Z')], now);
    expect(ins.total).toBe(2);
    expect(ins.active7).toBe(1);
    expect(ins.avgDay).toBe(4);
    expect(ins.accuracy.sub).toEqual({ attempts: 20, firstTry: 9 });
    expect(ins.weak).toEqual({ op: 'sub', pct: 45 });
    expect(ins.attention.map((a) => a.id)).toEqual(['ა', 'ბ']);
  });
});

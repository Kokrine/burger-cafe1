import { describe, expect, it } from 'vitest';
import { weakestOp } from './insight';

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

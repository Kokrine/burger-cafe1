import { describe, expect, it } from 'vitest';
import { bestFit, clipToRect, convexIntersectsRect, roomOutline, type Pt } from './fit';

const diamond: Pt[] = [[0, -50], [100, 0], [0, 50], [-100, 0]];

describe('ოთახის ჩასმა ეკრანზე', () => {
  it('რომბი და კუთხის მართკუთხედი: კუთხეში არ იკვეთება, შუაში — იკვეთება', () => {
    expect(convexIntersectsRect(diamond, { x0: 60, y0: -50, x1: 100, y1: -30 })).toBe(false);
    expect(convexIntersectsRect(diamond, { x0: -10, y0: -10, x1: 10, y1: 10 })).toBe(true);
    expect(convexIntersectsRect(diamond, { x0: 200, y0: 0, x1: 300, y1: 10 })).toBe(false);
  });
  it('კუთხეებში ელემენტები რომბს არ ზღუდავს — ეკრანს მთლიანად ავსებს', () => {
    const bounds = { x0: 0, y0: 0, x1: 800, y1: 400 };
    const corners = [
      { x0: 0, y0: 0, x1: 150, y1: 60 }, { x0: 650, y0: 0, x1: 800, y1: 60 },
      { x0: 0, y0: 340, x1: 150, y1: 400 }, { x0: 650, y0: 340, x1: 800, y1: 400 },
    ];
    const fit = bestFit(diamond, bounds, corners, 10)!;
    expect(fit.scale).toBeCloseTo(4, 1); // 200×100 → 800×400
    expect(fit.center[0]).toBeCloseTo(400, 0);
  });
  it('შუაში მდგარი ელემენტი ზომას ამცირებს, მაგრამ ოთახი მას არ ფარავს', () => {
    const bounds = { x0: 0, y0: 0, x1: 800, y1: 400 };
    const block = { x0: 0, y0: 150, x1: 160, y1: 400 }; // მარცხენა სვეტი (ტელეფონის მენიუ)
    const fit = bestFit(diamond, bounds, [block], 10)!;
    const sp = diamond.map(([x, y]): Pt => [fit.center[0] + x * fit.scale, fit.center[1] + y * fit.scale]);
    expect(convexIntersectsRect(sp, block)).toBe(false);
    expect(fit.scale).toBeGreaterThan(2.5);
  });
  it('ოთახის სილუეტი: 6 წვერო, კედლები იატაკზე მაღლაა', () => {
    const o = roomOutline(800, 300, 11, 8, 48, 220);
    expect(o).toHaveLength(6);
    expect(Math.min(...o.map((p) => p[1]))).toBe(300 - 220);
  });
});

describe('ცარიელი იატაკის მოჭრა', () => {
  it('რომბის ქვედა წვერო იჭრება, დანარჩენი რჩება', () => {
    const c = clipToRect(diamond, { x0: -1000, y0: -1000, x1: 1000, y1: 20 });
    expect(Math.max(...c.map((p) => p[1]))).toBe(20);
    expect(c.length).toBe(5);
    expect(clipToRect(diamond, { x0: -1000, y0: -1000, x1: 1000, y1: 1000 })).toHaveLength(4);
  });
});

import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { ITEMS, PRODUCTS } from '../config/economy';
import type { Grade } from '../core/types';
import { allBuilt, applyPurchase, canBuy, cafeStats, itemById } from './economy';
import { branchIncome, closeService, ensureToday, makeReport, recordSale } from './day';
import { LAYOUTS, isWall } from '../config/layout';
import { CAFE_LEVELS } from '../config/economy';

describe('განვითარების გზა', () => {
  it('ყველა კლასში შესაძლებელია ბოლომდე მისვლა: დონე 4 და მეორე ფილიალი', () => {
    for (const g of [1, 2, 3, 4] as Grade[]) {
      const p = newProgress(g);
      p.money = 1_000_000;
      // ყოველ ჯერზე ვყიდულობთ ყველაფერს, რისი ყიდვაც შეიძლება, სანამ ახალი არაფერი იხსნება
      for (let round = 0; round < 20; round++) {
        let bought = false;
        for (const it of ITEMS) while (canBuy(p, it).ok) { applyPurchase(p, it); bought = true; }
        if (!bought) break;
      }
      expect(p.cafeLevel).toBe(4);
      expect(p.branches).toBe(2);
      for (const it of ITEMS) expect(p.owned[it.id] ?? 0, it.id).toBe(it.max);
      const s = cafeStats(p);
      expect(s.menu).toEqual(expect.arrayContaining(['burger', 'cheeseburger', 'double', 'juice', 'fries', 'icecream']));
    }
  });
  it('დონე ნივთების ყიდვის გარეშე არ იწევს', () => {
    const p = newProgress(3);
    p.money = 1_000_000;
    expect(canBuy(p, itemById('level2'))).toMatchObject({ ok: false, reason: 'items' });
    expect(canBuy(p, itemById('branch2'))).toMatchObject({ ok: false, reason: 'level' });
  });
});

describe('მეორე ფილიალი', () => {
  it('ფილიალამდე შემოსავალი 0-ია, მერე ყოველდღე ემატება და ანგარიშში ცალკე ჩანს', () => {
    const p = newProgress(3);
    expect(branchIncome(p)).toBe(0);
    p.branches = 2;
    expect(branchIncome(p)).toBe(40);
    const money = p.money;
    ensureToday(p);
    const B = PRODUCTS.burger.prices[3][0];
    recordSale(p, ['burger'], B, 0);
    closeService(p, 1);
    closeService(p, 1); // მეორედ არ ემატება
    const r = makeReport(p.today!, 3);
    expect(r.branch).toBe(40);
    expect(r.revenue).toBe(B + 40);
    expect(r.discount).toBe(0);
    expect(p.money).toBe(money + 40);
    expect(p.today!.played).toBe(true);
    expect(p.today!.left).toBe(1);
  });
  it('1 კლასში ფილიალის შემოსავალი პატარაა (მასშტაბით)', () => {
    expect(branchIncome({ branches: 2, grade: 1 })).toBe(8);
  });
});

describe('ყოველ ნივთს კაფეში თავისი ადგილი აქვს', () => {
  it('ყველა დონეზე: ნივთების რაოდენობას ემთხვევა ადგილების რაოდენობა', () => {
    for (const lvl of [1, 2, 3, 4]) {
      const L = LAYOUTS[lvl];
      for (const it of ITEMS) {
        if (it.category !== 'equipment' && it.category !== 'decor') continue;
        if (['grillFast', 'drinkAuto', 'cashRegister', 'cashBox'].includes(it.id)) continue; // ცვლის სხვას / დახლზეა
        if (it.minLevel > lvl) continue;
        expect(L.slots[it.id]?.length ?? 0, `${it.id} @ L${lvl}`).toBeGreaterThanOrEqual(it.max);
      }
    }
  });
  it('იატაკის ნივთები ოთახის ფარგლებშია', () => {
    for (const lvl of [1, 2, 3, 4] as const) {
      const [W, D] = CAFE_LEVELS[lvl].room;
      for (const [id, slots] of Object.entries(LAYOUTS[lvl].slots)) for (const s of slots) {
        if (isWall(s)) continue;
        expect(s.x, id).toBeGreaterThanOrEqual(0);
        expect(s.y, id).toBeGreaterThanOrEqual(0);
        expect(s.x + 0.8, id).toBeLessThanOrEqual(W);
        expect(s.y + 0.8, id).toBeLessThanOrEqual(D);
      }
    }
  });
});

describe('ყველაფერი აშენდა', () => {
  it('allBuilt მხოლოდ მაშინ, როცა ყველა ნივთი მაქსიმუმამდეა', () => {
    const p = newProgress(4);
    expect(allBuilt(p)).toBe(false);
    for (const it of ITEMS) p.owned[it.id] = it.max;
    expect(allBuilt(p)).toBe(true);
    p.owned.table = 1;
    expect(allBuilt(p)).toBe(false);
  });
});

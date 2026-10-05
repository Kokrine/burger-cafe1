import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { STOCK } from '../config/economy';
import { DIFFICULTY } from '../config/difficulty';
import type { Grade } from '../core/types';
import { buyPacks, cartCost, consume, ensureToday, finishDay, forecast, makeReport, neededStock, recordSale, rentFor } from './day';
import { listSumProblem, profitProblem } from './math/generator';
import { makeFeasibleOrder } from './orders';

describe('საწყობი', () => {
  it('საჭირო ინგრედიენტები მენიუს მიხედვით', () => {
    expect(neededStock(['burger', 'juice'])).toEqual(expect.arrayContaining(['bun', 'patty', 'ketchup', 'mayo', 'lettuce', 'juice']));
    expect(neededStock(['burger', 'juice'])).not.toContain('cheese');
    expect(neededStock(['burger', 'cheeseburger', 'fries'])).toContain('potato');
  });
  it('პროგნოზი: ფუნთუშა ≈ კლიენტების რაოდენობა', () => {
    const f = forecast(['burger'], 6);
    expect(f.bun).toBe(6);
    expect(f.patty).toBe(6);
    expect(f.cheese).toBe(0);
  });
  it('ყიდვა: ფული მცირდება, მარაგი იზრდება შეკვრის ზომით, ხარჯი იწერება', () => {
    const p = newProgress(2);
    const bun0 = p.stock.bun;
    const cost = buyPacks(p, { bun: 4, patty: 2 });
    expect(cost).toBe(4 * STOCK.bun.price[2] + 2 * STOCK.patty.price[2]);
    expect(p.money).toBe(50 - cost);
    expect(p.stock.bun).toBe(bun0 + 4 * STOCK.bun.pack);
    expect(p.today!.ingredients).toBe(cost);
    expect(p.today!.purchases).toHaveLength(2);
  });
  it('ფულზე მეტის ყიდვა არ შეიძლება', () => {
    const p = newProgress(1);
    expect(() => buyPacks(p, { patty: 9, icecream: 9 })).toThrow();
  });
  it('ინგრედიენტის დახარჯვა მარაგის ფარგლებში', () => {
    const p = newProgress(2);
    p.stock.cheese = 1;
    expect(consume(p, 'cheese')).toBe(true);
    expect(consume(p, 'cheese')).toBe(false);
    expect(p.stock.cheese).toBe(0);
  });
  it('1 კლასის შეკვრების ფასები 1–5 ₾', () => {
    for (const s of Object.values(STOCK)) {
      expect(s.price[1]).toBeGreaterThanOrEqual(1);
      expect(s.price[1]).toBeLessThanOrEqual(5);
    }
  });
});

describe('დღის ანგარიში', () => {
  it('შემოსავალი = გაყიდვები + ჩაი; ხარჯი = ინგრედიენტები + ქირა; მოგება = სხვაობა', () => {
    const p = newProgress(3);
    buyPacks(p, { bun: 2 });
    recordSale(p, ['burger', 'juice'], 11, 2);
    recordSale(p, ['burger'], 8, 1);
    const r = makeReport(p.today!, 3);
    expect(r.revenue).toBe(22);
    expect(r.revenueRows.find((x) => x.id === 'burger')).toMatchObject({ qty: 2, price: 8, sum: 16 });
    expect(r.tips).toBe(3);
    expect(r.discount).toBe(0);
    expect(r.expenses).toBe(2 * STOCK.bun.price[3] + rentFor(p));
    expect(r.profit).toBe(r.revenue - r.expenses);
  });
  it('აქციის ფასდაკლება ჩანს ცალკე ხაზად', () => {
    const p = newProgress(4);
    recordSale(p, ['burger', 'juice', 'juice', 'juice'], 12 + 2 * 4, 0);
    const r = makeReport(p.today!, 4);
    expect(r.discount).toBe(4);
  });
  it('მიზნის შესრულება ხსნის შემდეგ დღეს; ქირა იხდება; ისტორია იწერება', () => {
    const p = newProgress(2);
    const t = ensureToday(p);
    recordSale(p, ['burger'], t.goal, 0);
    const money = p.money;
    const { goalMet } = finishDay(p);
    expect(goalMet).toBe(true);
    expect(p.day).toBe(2);
    expect(p.money).toBe(money - t.rent);
    expect(p.history).toHaveLength(1);
    expect(p.today).toBeNull();
  });
  it('მიზანი თუ არ შესრულდა — იგივე დღე მეორდება', () => {
    const p = newProgress(2);
    ensureToday(p);
    finishDay(p);
    expect(p.day).toBe(1);
  });
  it('ფული ქირის შემდეგ უარყოფითი არ ხდება', () => {
    const p = newProgress(1);
    p.money = 1;
    ensureToday(p);
    finishDay(p);
    expect(p.money).toBe(0);
  });
  it('ანგარიშის ამოცანები კლასის ფარგლებშია (ან არ ისმება)', () => {
    for (const g of [1, 2, 3, 4] as Grade[]) {
      for (const terms of [[3, 4, 2], [40, 35, 12], [300, 450], [5]]) {
        const pr = listSumProblem(terms, 'revenue', g);
        const sum = terms.reduce((a, b) => a + b, 0);
        if (sum > DIFFICULTY[g].max) expect(pr).toBeNull();
        else expect(pr!.answer).toBe(sum);
      }
      const profit = profitProblem(15, 9, g)!;
      expect(profit.kind).toBe('profit');
      expect(profit.answer).toBe(6);
      const loss = profitProblem(9, 15, g)!;
      expect(loss.kind).toBe('loss');
      expect(loss.answer).toBe(6);
      expect(loss.answer).toBeGreaterThan(0);
    }
    expect(profitProblem(25, 9, 1)).toBeNull();
  });
  it('კალათის ფასი', () => {
    expect(cartCost({ bun: 4 }, 2)).toBe(12);
  });
});

describe('დღის მდგრადობა', () => {
  it('დღე იმ კლასის ფასებით ითვლება, რომლითაც დაიწყო (კლასი შუა დღეს შეიცვალა)', () => {
    const p = newProgress(3);
    const t = ensureToday(p);
    expect(t.grade).toBe(3);
    recordSale(p, ['burger'], 8, 0);
    p.grade = 1; // მაგ. მასწავლებელმა კლასის დონე შეცვალა
    const { report } = finishDay(p);
    expect(report.discount).toBe(0); // სტრიქონების ჯამი = შემოსავალი, ყალბი „ფასდაკლება" არ ჩნდება
    expect(report.revenueRows[0].price).toBe(8);
  });
  it('სოუსის გარეშე ბურგერი არ კეთდება — საწყობი ამას ამოწმებს', () => {
    const have = (s: Record<string, number>) => (id: string) => s[id] ?? 0;
    expect(makeFeasibleOrder(['burger'], have({ bun: 5, patty: 5, lettuce: 5 }))).toBeNull();
    expect(makeFeasibleOrder(['burger'], have({ bun: 5, patty: 5, lettuce: 5, ketchup: 5, mayo: 5 }))).not.toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { PRODUCTS, STOCK } from '../config/economy';
import { DIFFICULTY } from '../config/difficulty';
import type { Grade } from '../core/types';
import { buyPacks, cartCost, consume, dayCustomers, dayGoal, daySideChance, ensureToday, finishDay, forecast, makeReport, neededStock, pickEvent, recordSale, rentFor, supplierAid } from './day';
import { hoursProblem, listSumProblem, partSumProblems, prepProblem, profitProblem } from './math/generator';
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
    const B = PRODUCTS.burger.prices[3][0], J = PRODUCTS.juice.prices[3][0];
    buyPacks(p, { bun: 2 });
    recordSale(p, ['burger', 'juice'], B + J, 2);
    recordSale(p, ['burger'], B, 1);
    const r = makeReport(p.today!, 3);
    expect(r.revenue).toBe(2 * B + J + 3);
    expect(r.revenueRows.find((x) => x.id === 'burger')).toMatchObject({ qty: 2, price: B, sum: 2 * B });
    expect(r.tips).toBe(3);
    expect(r.discount).toBe(0);
    expect(r.expenses).toBe(2 * STOCK.bun.price[3] + rentFor(p));
    expect(r.profit).toBe(r.revenue - r.expenses);
  });
  it('აქციის ფასდაკლება ჩანს ცალკე ხაზად', () => {
    const p = newProgress(4);
    const B = PRODUCTS.burger.prices[4][0], J = PRODUCTS.juice.prices[4][0];
    recordSale(p, ['burger', 'juice', 'juice', 'juice'], B + 2 * J, 0); // 3 წვენი 2-ის ფასად
    const r = makeReport(p.today!, 4);
    expect(r.discount).toBe(J);
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
        if (sum > DIFFICULTY[g].max || terms.length < 2) expect(pr).toBeNull(); // ერთი რიცხვი შესაკრები არ არის
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
    const B = PRODUCTS.burger.prices[3][0];
    recordSale(p, ['burger'], B, 0);
    p.grade = 1; // მაგ. მასწავლებელმა კლასის დონე შეცვალა
    const { report } = finishDay(p);
    expect(report.discount).toBe(0); // სტრიქონების ჯამი = შემოსავალი, ყალბი „ფასდაკლება" არ ჩნდება
    expect(report.revenueRows[0].price).toBe(B);
  });
  it('სოუსის გარეშე ბურგერი არ კეთდება — საწყობი ამას ამოწმებს', () => {
    const have = (s: Record<string, number>) => (id: string) => s[id] ?? 0;
    expect(makeFeasibleOrder(['burger'], have({ bun: 5, patty: 5, lettuce: 5 }))).toBeNull();
    expect(makeFeasibleOrder(['burger'], have({ bun: 5, patty: 5, lettuce: 5, ketchup: 5, mayo: 5 }))).not.toBeNull();
  });
});

describe('სამუშაო საათები', () => {
  it('დილის ამოცანა და სამუშაო დღის საათი ერთსა და იმავე საათებს იყენებს', () => {
    for (const g of [1, 2, 3, 4] as Grade[]) {
      const p = newProgress(g);
      const t = ensureToday(p);
      const [open, close] = t.hours!;
      expect(close).toBeGreaterThan(open);
      const pr = hoursProblem(g, Math.random, t.hours);
      expect(pr.vars.open).toBe(`${open}:00`);
      expect(pr.vars.close).toBe(`${close}:00`);
      expect(pr.answer).toBe(close - open);
      // prepProblem-იც იგივე საათებს გადასცემს
      for (let i = 0; i < 30; i++) {
        const q = prepProblem(g, { sub: 2, div: 2 }, Math.random, t.hours);
        if (q?.kind === 'hours') expect(q.answer).toBe(close - open);
      }
    }
  });
  it('ძველ შენახულ დღეს საათები ემატება', () => {
    const p = newProgress(2);
    const t = ensureToday(p);
    delete t.hours;
    expect(ensureToday(p).hours).toBeDefined();
  });
});

describe('მომწოდებლის დახმარება (თამაში არ ჩაიჭედება)', () => {
  it('ფული და მარაგი ორივე ამოიწურა — უფასოდ იაფი ბურგერის ინგრედიენტები', () => {
    const p = newProgress(2);
    p.money = 0;
    for (const k of Object.keys(p.stock)) p.stock[k as keyof typeof p.stock] = 0;
    const given = supplierAid(p);
    expect(given).toEqual(expect.arrayContaining(['bun', 'patty']));
    expect(makeFeasibleOrder(p.menu, (id) => p.stock[id as keyof typeof p.stock] ?? 0)).not.toBeNull();
    expect(p.money).toBe(0);
    expect(ensureToday(p).ingredients).toBe(0); // ხარჯად არ ითვლება
    expect(supplierAid(p)).toEqual([]); // დღეში ერთხელ
  });
  it('ფული ჰყოფნის — თვითონ იყიდის, საჩუქარი არ არის', () => {
    const p = newProgress(2);
    p.money = 50;
    for (const k of Object.keys(p.stock)) p.stock[k as keyof typeof p.stock] = 0;
    expect(supplierAid(p)).toEqual([]);
  });
  it('ბურგერი კეთდება — დახმარება არ სჭირდება', () => {
    const p = newProgress(2);
    p.money = 0;
    expect(supplierAid(p)).toEqual([]);
  });
});

describe('დღის მიზანი და პროგნოზი', () => {
  it('მიზანი გვერდით კერძებსაც ითვლის — ფრის ქვაბის ყიდვის შემდეგ იზრდება', () => {
    for (const g of [2, 3, 4] as Grade[]) {
      const p = newProgress(g);
      const before = dayGoal(p);
      p.menu = [...p.menu, 'fries'];
      expect(dayGoal(p)).toBeGreaterThan(before);
    }
  });
  it('3–4 კლასში (1–3 ცალი შეკვეთაში) გვერდით კერძს მეტი მარაგი სჭირდება', () => {
    expect(forecast(['burger', 'fries'], 6, 2).potato).toBeGreaterThan(forecast(['burger', 'fries'], 6, 1).potato);
  });
});

describe('დიდი ჯამი ნაწილ-ნაწილ (1 კლასი)', () => {
  it('ყოველი ნაწილი 20-ის ფარგლებშია და 2+ შესაკრებია; ნაწილები ერთად მთლიანზე მეტს არ აჭარბებს', () => {
    for (const terms of [[18, 4, 6], [9, 6, 8, 3], [12, 2, 3, 1, 6], [21, 4]]) {
      const parts = partSumProblems(terms, 1);
      for (const pr of parts) {
        const items = String(pr.vars.items).split(' + ').map(Number);
        expect(items.length).toBeGreaterThanOrEqual(2);
        expect(pr.answer).toBe(items.reduce((a, b) => a + b, 0));
        expect(pr.answer).toBeLessThanOrEqual(DIFFICULTY[1].max);
        expect(pr.input).toBe('choice');
      }
      expect(parts.reduce((a, pr) => a + pr.answer, 0)).toBeLessThanOrEqual(terms.reduce((a, b) => a + b, 0));
    }
    expect(partSumProblems([18, 4, 6], 1).map((p) => p.vars.items)).toEqual(['4 + 6']);
    expect(partSumProblems([30, 25], 1)).toEqual([]); // ვერცერთი ნაწილი — კალკულატორი
  });
});

describe('დღის მოვლენები', () => {
  it('პირველ დღეს არ არის; დეტერმინისტულია; ~40% დღეებში', () => {
    expect(pickEvent({ day: 1, history: [] })).toBeUndefined();
    expect(pickEvent({ day: 7, history: [] })).toBe(pickEvent({ day: 7, history: [] }));
    let n = 0;
    for (let d = 2; d < 402; d++) if (pickEvent({ day: d, history: [] })) n += 1;
    expect(n).toBeGreaterThan(100);
    expect(n).toBeLessThan(220);
  });
  it('ფესტივალი: მეტი კლიენტი და მეტი მიზანი; წვიმა: ნაკლები', () => {
    const p = newProgress(2);
    expect(dayCustomers(p, 'festival')).toBeGreaterThan(dayCustomers(p));
    expect(dayGoal(p, 'festival')).toBeGreaterThan(dayGoal(p));
    expect(dayCustomers(p, 'rainy')).toBeLessThan(dayCustomers(p));
  });
  it('მზიანი დღე: გვერდით კერძებს მეტი მარაგი სჭირდება', () => {
    expect(forecast(['burger', 'juice'], 6, 1, daySideChance('sunny')).juice).toBeGreaterThan(forecast(['burger', 'juice'], 6, 1, daySideChance()).juice);
  });
  it('ახალ დღეს მოვლენა ინახება და გადატვირთვისას იგივე რჩება', () => {
    const p = newProgress(2);
    for (let d = 2; d < 30; d++) {
      p.day = d; p.today = null;
      const t = ensureToday(p);
      expect(t.event).toBe(pickEvent(p));
      expect(ensureToday(p).event).toBe(t.event);
    }
  });
});

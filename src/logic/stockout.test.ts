import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { STOCK, type StockId } from '../config/economy';
import { buyEmergency, closeService, emergencyPrice, ensureToday, finishDay, makeReport, noteStockout, receiveDelivery } from './day';
import { canMake, makeFeasibleOrder, needsOf } from './orders';
import type { Grade } from '../core/types';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('მარაგის ამოწურვა დღის განმავლობაში', () => {
  it('სასწრაფო მიწოდება დილის ფასზე ძვირია ყველა კლასში', () => {
    for (const g of [1, 2, 3, 4] as Grade[]) for (const id of Object.keys(STOCK) as StockId[]) {
      expect(emergencyPrice(id, g)).toBeGreaterThan(STOCK[id].price[g]);
      expect(Number.isInteger(emergencyPrice(id, g))).toBe(true);
    }
  });
  it('სასწრაფო ყიდვა: ფული ახლავე, მარაგი კურიერის მოსვლისას, ხარჯში ცალკე ხაზი', () => {
    const p = newProgress(2);
    p.stock.bun = 0;
    const money = p.money;
    const cost = buyEmergency(p, 'bun', 2);
    expect(cost).toBe(2 * emergencyPrice('bun', 2));
    expect(p.money).toBe(money - cost);
    expect(p.stock.bun).toBe(0);
    receiveDelivery(p, 'bun', 2);
    expect(p.stock.bun).toBe(2 * STOCK.bun.pack);
    const r = makeReport(p.today!, 2);
    expect(r.expenseRows[0]).toMatchObject({ id: 'bun', emergency: true, sum: cost });
  });
  it('ფულზე მეტის სასწრაფოდ ყიდვა არ შეიძლება', () => {
    const p = newProgress(1);
    p.money = 1;
    expect(() => buyEmergency(p, 'patty', 1)).toThrow();
  });
  it('ამოწურვა იწერება და მეორე დილას ჩანს', () => {
    const p = newProgress(3);
    ensureToday(p);
    noteStockout(p, 'patty');
    noteStockout(p, 'patty');
    closeService(p, 0, 2);
    expect(p.today!.stockouts).toEqual(['patty']);
    expect(p.today!.missed).toBe(2);
    finishDay(p);
    expect(p.lastStockouts).toEqual(['patty']);
  });
});

describe('შეკვეთა მხოლოდ იმისგან, რაც კეთდება', () => {
  const menu = ['burger', 'cheeseburger', 'juice'];
  it('ფუნთუშა ან კოტლეტი თუ არ არის — შეკვეთა არ შედგება', () => {
    expect(makeFeasibleOrder(menu, (id) => (id === 'bun' ? 0 : 99))).toBeNull();
    expect(makeFeasibleOrder(menu, (id) => (id === 'patty' ? 0 : 99))).toBeNull();
  });
  it('კეტჩუპი თუ ამოიწურა — მხოლოდ სხვა ვარიანტებს უკვეთავენ', () => {
    const rnd = seeded(4);
    for (let i = 0; i < 200; i++) {
      const o = makeFeasibleOrder(menu, (id) => (id === 'ketchup' ? 0 : 99), rnd, 3)!;
      expect(o.layers).not.toContain('ketchup');
    }
  });
  it('წვენი თუ ამოიწურა — წვენს არ უკვეთავენ; რაოდენობა მარაგს არ აჭარბებს', () => {
    const rnd = seeded(5);
    for (let i = 0; i < 200; i++) {
      expect(makeFeasibleOrder(menu, (id) => (id === 'juice' ? 0 : 99), rnd, 3)!.sides).toEqual([]);
      const o = makeFeasibleOrder(menu, (id) => (id === 'juice' ? 1 : 99), rnd, 3)!;
      expect(o.sides.length).toBeLessThanOrEqual(1);
    }
  });
  it('საჭირო რაოდენობა: ორმაგს 2 კოტლეტი სჭირდება, ფუნთუშა — 1', () => {
    const n = needsOf(['bun_bottom', 'patty', 'cheese', 'patty', 'cheese', 'bun_top'], ['juice', 'juice']);
    expect(n).toEqual({ bun: 1, patty: 2, cheese: 2, juice: 2 });
    expect(canMake(['bun_bottom', 'patty', 'patty', 'bun_top'], [], (id) => (id === 'patty' ? 1 : 9))).toBe(false);
  });
});

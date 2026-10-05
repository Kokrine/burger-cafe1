import { describe, expect, it } from 'vitest';
import { burgerDone, canAdd, layerFor, makeOrder, matches, usedIngredients, type Order } from './orders';
import { cashierPlan, orderLines } from './cashier';
import { DIFFICULTY } from '../config/difficulty';
import { sideQtyMax } from './math/generator';
import type { Grade } from '../core/types';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const NAMES = { burger: 'ბურგერი', cheeseburger: 'ყველიანი', double: 'ორმაგი', juice: 'წვენი', fries: 'ფრი', icecream: 'ნაყინი' };
const FULL_MENU = ['burger', 'cheeseburger', 'double', 'juice', 'fries', 'icecream'];

describe('შეკვეთები და აწყობა', () => {
  it('შეკვეთა მხოლოდ მენიუს პროდუქტებისგან შედგება', () => {
    const rnd = seeded(11);
    for (let i = 0; i < 100; i++) {
      const o = makeOrder(['burger', 'juice'], rnd);
      expect(o.burger).toBe('burger');
      expect(o.layers[0]).toBe('bun_bottom');
      expect(o.layers.at(-1)).toBe('bun_top');
      for (const s of o.sides) expect(s).toBe('juice');
    }
  });
  it('რაოდენობა არ აღემატება კლასის ზღვარს; 1 კლასში — მხოლოდ 1', () => {
    const rnd = seeded(12);
    for (const g of [1, 2, 3, 4] as Grade[]) for (let i = 0; i < 200; i++) {
      const o = makeOrder(FULL_MENU, rnd, sideQtyMax(g, 4));
      expect(o.sides.length).toBeLessThanOrEqual(DIFFICULTY[g].qtyMax);
      expect(new Set(o.sides).size).toBeLessThanOrEqual(1);
    }
  });
  it('ფენების თანმიმდევრობა მოწმდება', () => {
    const o: Order = { burger: 'burger', layers: ['bun_bottom', 'patty', 'ketchup', 'bun_top'], sides: [] };
    expect(canAdd('patty', [], [o])).toBe(false);
    expect(canAdd(layerFor('bun', []), [], [o])).toBe(true);
    expect(canAdd('ketchup', ['bun_bottom'], [o])).toBe(false);
    expect(canAdd('patty', ['bun_bottom'], [o])).toBe(true);
    expect(layerFor('bun', ['bun_bottom', 'patty', 'ketchup'])).toBe('bun_top');
    const plate = [...o.layers];
    expect(burgerDone(plate)).toBe(true);
    expect(matches(o, plate, [])).toBe(true);
    expect(matches(o, plate, ['juice'])).toBe(false);
    expect(matches({ ...o, sides: ['juice', 'juice'] }, plate, ['juice'])).toBe(false);
    expect(matches({ ...o, sides: ['juice', 'juice'] }, plate, ['juice', 'juice'])).toBe(true);
    expect(canAdd('cheese', plate, [o])).toBe(false);
  });
  it('ყუთები ნაცრისფერია, თუ ინგრედიენტი მენიუში არ გამოიყენება', () => {
    expect(usedIngredients(['burger']).has('cheese')).toBe(false);
    expect(usedIngredients(['burger', 'cheeseburger']).has('cheese')).toBe(true);
  });
});

describe('სალაროს გეგმა', () => {
  it('ჯამი ემთხვევა შეკვეთას; ყოველი ამოცანა კლასის ფარგლებშია', () => {
    const rnd = seeded(13);
    for (const g of [1, 2, 3, 4] as Grade[]) for (const lvl of [0, 2, 4]) for (let i = 0; i < 200; i++) {
      const order = makeOrder(FULL_MENU, rnd, sideQtyMax(g, lvl));
      const plan = cashierPlan(order, g, { add: lvl, sub: lvl, mul: lvl, div: lvl }, NAMES, rnd);
      const lines = orderLines(order, g, NAMES);
      const full = lines.reduce((a, l) => a + l.qty * l.price, 0);
      expect(plan.total).toBe(plan.promo ? full - lines.find((l) => l.qty === 3)!.price : full);
      expect(plan.problems.length).toBeGreaterThanOrEqual(1);
      expect(plan.problems.length).toBeLessThanOrEqual(2);
      for (const p of plan.problems) {
        expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBeLessThanOrEqual(DIFFICULTY[g].max);
        expect(DIFFICULTY[g].ops).toContain(p.op);
      }
      const sum = plan.problems.find((p) => p.kind === 'sum' || p.kind === 'sumPromo');
      if (sum) expect(sum.answer).toBe(plan.total);
    }
  });
});

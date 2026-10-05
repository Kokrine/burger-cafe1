import { describe, expect, it } from 'vitest';
import { applyPurchase, cafeStats, canBuy, itemById, itemPrice, scaledPrice } from './economy';
import { recordAnswer } from './scoring';
import { newProgress } from '../core/store';
import { ITEMS } from '../config/economy';
import type { Grade } from '../core/types';

const grades: Grade[] = [1, 2, 3, 4];

describe('ფასები კლასის მიხედვით', () => {
  it('ყველა ფასი მთელი, დადებითი რიცხვია', () => {
    for (const g of grades) for (const it of ITEMS) {
      const p = itemPrice(it, g);
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(0);
      if (it.basePrice > 0) expect(p).toBeGreaterThan(0);
    }
  });
  it('1 კლასის 20-ზე დიდი ფასები ათეულებზე მრგვალდება', () => {
    for (const it of ITEMS) {
      const p = itemPrice(it, 1);
      if (p > 20) expect(p % 10).toBe(0);
    }
  });
  it('საწყისი ფული', () => {
    expect(scaledPrice(100, 1)).toBe(20);
    expect(scaledPrice(100, 4)).toBe(200);
  });
});

describe('ყიდვა და განვითარება', () => {
  it('ყიდვა აკლებს ფულს, ამატებს ნივთს და ხსნის პროდუქტს', () => {
    const p = newProgress(3);
    const fryer = itemById('fryer');
    expect(canBuy(p, fryer).ok).toBe(true);
    applyPurchase(p, fryer);
    expect(p.money).toBe(100 - 70);
    expect(p.owned.fryer).toBe(1);
    expect(p.menu).toContain('fries');
    expect(canBuy(p, fryer)).toMatchObject({ ok: false, reason: 'maxed' });
  });
  it('დონე საჭიროებს ნივთების რაოდენობას', () => {
    const p = newProgress(3);
    p.money = 10000;
    expect(canBuy(p, itemById('level2'))).toMatchObject({ ok: false, reason: 'items' });
    for (const id of ['plant', 'picture', 'table']) applyPurchase(p, itemById(id));
    expect(canBuy(p, itemById('level2')).ok).toBe(true);
    applyPurchase(p, itemById('level2'));
    expect(p.cafeLevel).toBe(2);
    expect(canBuy(p, itemById('jukebox')).ok).toBe(true);
  });
  it('ეფექტები ჯამდება', () => {
    const p = newProgress(3);
    p.money = 10000;
    applyPurchase(p, itemById('plant'));
    applyPurchase(p, itemById('plant'));
    applyPurchase(p, itemById('table'));
    const s = cafeStats(p);
    expect(s.patience).toBe(1.1);
    expect(s.customersPerDay).toBe(8);
    expect(s.grillSlots).toBe(4);
  });
});

describe('ქულები (ცალკე ვალუტა)', () => {
  it('ფული ქულებით არ იცვლება; მეორე ცდა ნაკლებია, მაგრამ არა ნული', () => {
    const p = newProgress(2);
    const money = p.money;
    const a1 = recordAnswer(p, 'sub', 1);
    const a2 = recordAnswer(p, 'sub', 2);
    const a3 = recordAnswer(p, 'sub', 3);
    expect(a1.points).toBeGreaterThan(a2.points);
    expect(a2.points).toBeGreaterThan(a3.points);
    expect(a3.points).toBeGreaterThan(0);
    expect(a2.stars).toBe(0);
    expect(p.money).toBe(money);
    expect(p.accuracy.sub).toEqual({ attempts: 3, firstTry: 1, correct: 2 });
  });
  it('5 ზედიზედ სწორი — ბონუს ვარსკვლავები და სირთულის ზრდა', () => {
    const p = newProgress(2);
    let last = { streakBonus: false, levelUp: false };
    for (let i = 0; i < 5; i++) last = recordAnswer(p, 'add', 1);
    expect(last.streakBonus).toBe(true);
    expect(last.levelUp).toBe(true);
    expect(p.stars).toBe(5 + 2);
    expect(p.adaptive.add.level).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { ensureToday, recordSale } from './day';
import { pickQuests, questValue, settleQuests } from './quests';

describe('დღის დავალებები', () => {
  it('ორი დავალება: ერთი ბიზნესის (₾), ერთი მათემატიკის (⭐); დღის ნომრით მუდმივია', () => {
    const p = newProgress(2);
    const q = pickQuests(p);
    expect(q.map((x) => x.kind)).toEqual(['business', 'math']);
    expect(q[0].reward.money).toBeGreaterThan(0);
    expect(q[0].reward.stars).toBeUndefined();
    expect(q[1].reward.stars).toBeGreaterThan(0);
    expect(q[1].reward.money).toBeUndefined();
    expect(pickQuests(p)).toEqual(q);
  });
  it('დღე იქმნება დავალებებით; შესრულებისას ჯილდო ერიცხება ერთხელ', () => {
    const p = newProgress(2);
    const t = ensureToday(p);
    t.quests = [
      { id: 'sell', kind: 'business', target: 2, reward: { money: 5 }, done: false },
      { id: 'mathFirst', kind: 'math', target: 1, reward: { stars: 2, points: 15 }, done: false },
    ];
    const money = p.money, stars = p.stars;
    recordSale(p, ['burger'], 5, 0);
    expect(settleQuests(p)).toEqual([]);
    recordSale(p, ['burger'], 5, 0);
    t.mathFirst = 1;
    expect(settleQuests(p).map((q) => q.id)).toEqual(['sell', 'mathFirst']);
    expect(p.money).toBe(money + 5);   // ფული — მხოლოდ ბიზნესის დავალებიდან
    expect(p.stars).toBe(stars + 2);   // ვარსკვლავები — მხოლოდ მათემატიკის დავალებიდან
    expect(settleQuests(p)).toEqual([]); // მეორედ არ ერიცხება
  });
  it('გადაყრის გარეშე: ერთი გადაყრილი ნივთიც კი აუქმებს', () => {
    const p = newProgress(2);
    const t = ensureToday(p);
    const q = { id: 'noWaste' as const, kind: 'business' as const, target: 2, reward: { money: 5 }, done: false };
    t.served = 3;
    expect(questValue(q, t)).toBe(3);
    t.wasted = 1;
    expect(questValue(q, t)).toBe(0);
  });
});

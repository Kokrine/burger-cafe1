import { describe, expect, it } from 'vitest';
import { newProgress } from '../core/store';
import { BADGES, badgeProgress, checkBadges, touchPlayDate } from './badges';
import { ensureToday, finishDay, recordSale } from './day';

describe('ბეჯები', () => {
  it('პირველი 10 ბურგერი — გაყიდვების მიხედვით', () => {
    const p = newProgress(2);
    ensureToday(p);
    for (let i = 0; i < 9; i++) recordSale(p, ['burger'], 5, 0);
    expect(checkBadges(p)).not.toContain('burgers10');
    recordSale(p, ['burger'], 5, 0);
    expect(checkBadges(p)).toContain('burgers10');
  });
  it('ტაბულის ჩემპიონი 1 კლასში მიუწვდომელია', () => {
    const p = newProgress(1);
    p.counters.ok_mul = 100;
    expect(checkBadges(p)).not.toContain('tableChampion');
    p.grade = 2;
    expect(checkBadges(p)).toContain('tableChampion');
  });
  it('მოგების ბეჯის მიზანი კლასის მიხედვით იზრდება', () => {
    const b = BADGES.find((x) => x.id === 'profit500')!;
    expect(b.target(1)).toBe(100);
    expect(b.target(3)).toBe(500);
    expect(b.target(4)).toBe(1000);
  });
  it('უკვე მოპოვებული ბეჯი მეორედ არ ჩნდება', () => {
    const p = newProgress(2);
    p.bestStreak = 12;
    expect(checkBadges(p)).toContain('streak10');
    p.badges.push('streak10');
    expect(checkBadges(p)).not.toContain('streak10');
    expect(badgeProgress(BADGES.find((x) => x.id === 'streak10')!, p).done).toBe(true);
  });
  it('7 დღე ზედიზედ: კალენდარული სერია', () => {
    const p = newProgress(2);
    const d = (s: string) => new Date(`${s}T12:00:00`);
    touchPlayDate(p, d('2026-10-01'));
    touchPlayDate(p, d('2026-10-01'));
    expect(p.dayStreak).toBe(1);
    for (let i = 2; i <= 7; i++) touchPlayDate(p, d(`2026-10-0${i}`));
    expect(p.dayStreak).toBe(7);
    expect(checkBadges(p)).toContain('days7');
    touchPlayDate(p, d('2026-10-10'));
    expect(p.dayStreak).toBe(1);
  });
  it('დღის დასრულება: პირველი დღე და მოგების მთვლელი', () => {
    const p = newProgress(3);
    const t = ensureToday(p);
    recordSale(p, ['burger'], t.goal + t.rent + 20, 0);
    finishDay(p);
    expect(checkBadges(p)).toContain('firstDay');
    expect(p.counters.profit_total).toBeGreaterThan(0);
    expect(p.counters.goals).toBe(1);
  });
});

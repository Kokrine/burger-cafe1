// მიღწევები (ბეჯები). ყოველ ბეჯს აქვს პროგრესი (value/target), რომ ბავშვმა
// დაინახოს, რამდენი აკლია. სახელები — strings.ka.ts-ში (S.badges).
import type { Grade, Progress } from '../core/types';
import { scaledPrice } from './economy';
import { allows } from './math/generator';

export interface BadgeDef {
  id: string;
  icon: string;
  target: (g: Grade) => number;
  value: (p: Progress) => number;
  /** მხოლოდ ზოგ კლასში (მაგ. ტაბულა — 2 კლასიდან). */
  available?: (g: Grade) => boolean;
}

const c = (p: Progress, k: string) => p.counters?.[k] ?? 0;

export const BADGES: BadgeDef[] = [
  { id: 'firstDay', icon: 'icon_calendar', target: () => 1, value: (p) => p.history.length },
  { id: 'burgers10', icon: 'menu_burger', target: () => 10, value: (p) => c(p, 'burgers') },
  { id: 'burgers50', icon: 'menu_double', target: () => 50, value: (p) => c(p, 'burgers') },
  { id: 'changeMaster', icon: 'coin', target: () => 20, value: (p) => c(p, 'change_ok') },
  { id: 'tableChampion', icon: 'icon_bolt', target: () => 30, value: (p) => c(p, 'ok_mul'), available: (g) => allows(g, 'mul') },
  { id: 'divider', icon: 'grill_patty_ready', target: () => 20, value: (p) => c(p, 'ok_div'), available: (g) => allows(g, 'div') },
  { id: 'streak10', icon: 'star', target: () => 10, value: (p) => p.bestStreak },
  { id: 'days7', icon: 'icon_clock', target: () => 7, value: (p) => p.dayStreak },
  { id: 'profit500', icon: 'bill', target: (g) => scaledPrice(500, g), value: (p) => c(p, 'profit_total') },
  { id: 'happy30', icon: 'icon_heart', target: () => 30, value: (p) => c(p, 'served') },
  { id: 'grow', icon: 'icon_level_up', target: () => 1, value: (p) => p.cafeLevel - 1 },
  { id: 'tycoon', icon: 'icon_store', target: () => 1, value: (p) => p.branches - 1 },
  { id: 'practice25', icon: 'icon_menu_book', target: () => 25, value: (p) => c(p, 'practice') },
  { id: 'events3', icon: 'icon_sparkle', target: () => 3, value: (p) => c(p, 'events') },
];

export const badgeAvailable = (b: BadgeDef, g: Grade) => b.available?.(g) ?? true;

export function badgeProgress(b: BadgeDef, p: Progress) {
  const target = b.target(p.grade);
  const value = Math.min(target, b.value(p));
  return { value, target, done: p.badges.includes(b.id) || value >= target };
}

/** ახლად მოპოვებული ბეჯები (ჯერ არ არის p.badges-ში). */
export function checkBadges(p: Progress): string[] {
  return BADGES.filter((b) => badgeAvailable(b, p.grade) && !p.badges.includes(b.id) && b.value(p) >= b.target(p.grade)).map((b) => b.id);
}

export const bump = (p: Progress, key: string, by = 1) => {
  p.counters ??= {};
  p.counters[key] = (p.counters[key] ?? 0) + by;
};

/** კალენდარული სერია: გუშინაც ითამაშა → +1, დღეს უკვე ითამაშა → იგივე, თორემ 1. */
export function touchPlayDate(p: Progress, now = new Date()) {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(now);
  if (p.lastPlayDate === today) return;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  p.dayStreak = p.lastPlayDate === iso(y) ? (p.dayStreak ?? 0) + 1 : 1;
  p.lastPlayDate = today;
}

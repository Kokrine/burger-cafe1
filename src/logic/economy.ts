// ეკონომიკის წმინდა ფუნქციები (UI-ს გარეშე, ტესტირებადი).
import type { Grade, Progress } from '../core/types';
import { BASE_STATS, GRADE_SCALE, ITEMS, PRODUCTS, ROUND_TO, type ItemDef, type ProductId } from '../config/economy';

export function scaledPrice(base: number, grade: Grade): number {
  if (base <= 0) return 0;
  const raw = base * GRADE_SCALE[grade];
  const r = ROUND_TO[grade];
  const step = raw >= r.bigFrom ? r.big : r.small;
  return Math.max(step, Math.round(raw / step) * step);
}

export const itemById = (id: string): ItemDef => {
  const it = ITEMS.find((i) => i.id === id);
  if (!it) throw new Error(`unknown item ${id}`);
  return it;
};

export const itemPrice = (it: ItemDef, grade: Grade) => scaledPrice(it.basePrice, grade);

/** ნაყიდი ნივთების რაოდენობა (საწყისების და მენიუს/დონეების გარეშე) — დონის მოთხოვნისთვის. */
export function boughtCount(p: Progress): number {
  let n = 0;
  for (const it of ITEMS) {
    if (it.starter || it.category === 'expansion') continue;
    n += p.owned[it.id] ?? 0;
  }
  return n;
}

export type BuyCheck =
  | { ok: true }
  | { ok: false; reason: 'maxed' | 'level' | 'requires' | 'items' | 'money'; need?: number | string };

export function canBuy(p: Progress, it: ItemDef): BuyCheck {
  const have = p.owned[it.id] ?? 0;
  if (have >= it.max) return { ok: false, reason: 'maxed' };
  if (p.cafeLevel < it.minLevel) return { ok: false, reason: 'level', need: it.minLevel };
  const missing = (it.requires ?? []).find((r) => !(p.owned[r] > 0));
  if (missing) return { ok: false, reason: 'requires', need: missing };
  if (it.minItems && boughtCount(p) < it.minItems) return { ok: false, reason: 'items', need: it.minItems };
  if (p.money < itemPrice(it, p.grade)) return { ok: false, reason: 'money', need: itemPrice(it, p.grade) };
  return { ok: true };
}

/** ყიდვის შედეგი პროგრესზე (ფული მცირდება, ნივთი ემატება, ეფექტები ჩაირთვება). */
export function applyPurchase(p: Progress, it: ItemDef) {
  const price = itemPrice(it, p.grade);
  p.money -= price;
  p.owned[it.id] = (p.owned[it.id] ?? 0) + 1;
  if (it.effects.unlock && !p.menu.includes(it.effects.unlock)) p.menu.push(it.effects.unlock);
  if (it.effects.level) p.cafeLevel = Math.max(p.cafeLevel, it.effects.level);
  if (it.effects.branch) p.branches = 2;
  p.lastBought = it.id;
}

export interface CafeStats {
  grillSlots: number;
  cookSpeed: number;
  patience: number;
  customersPerDay: number;
  autoDrink: boolean;
  changeHint: boolean;
  menu: ProductId[];
}

/** ყველა ნაყიდი ნივთის ჯამური ეფექტი — ამას გამოიყენებს თამაშის ლოგიკა. */
export function cafeStats(p: Progress): CafeStats {
  const s: CafeStats = {
    grillSlots: 0,
    cookSpeed: BASE_STATS.cookSpeed,
    patience: BASE_STATS.patience,
    customersPerDay: BASE_STATS.customersPerDay,
    autoDrink: false,
    changeHint: false,
    menu: p.menu.filter((m): m is ProductId => m in PRODUCTS),
  };
  for (const it of ITEMS) {
    const k = p.owned[it.id] ?? 0;
    if (!k) continue;
    const e = it.effects;
    s.grillSlots += (e.grillSlots ?? 0) * k;
    s.cookSpeed += (e.cookSpeed ?? 0) * k;
    s.patience += (e.patience ?? 0) * k;
    s.customersPerDay += (e.customers ?? 0) * k;
    if (e.autoDrink) s.autoDrink = true;
    if (e.changeHint) s.changeHint = true;
  }
  s.patience = Math.round(s.patience * 100) / 100;
  s.cookSpeed = Math.round(s.cookSpeed * 100) / 100;
  return s;
}

/** მაღაზიის ყველა ნივთი ნაყიდია (ყველა დონე, ფილიალი, რეცეპტები, დეკორი — მაქსიმუმამდე). */
export const allBuilt = (p: Pick<Progress, 'owned'>) => ITEMS.every((it) => it.starter || (p.owned[it.id] ?? 0) >= it.max);

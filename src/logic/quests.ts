// დღის დავალებები: ყოველ დღეს ორი — ერთი ბიზნესის (ჯილდო ₾) და ერთი მათემატიკის (ჯილდო ⭐).
// ორი ვალუტა არ ერევა: ფული მხოლოდ კაფეს საქმიდან, ვარსკვლავები მხოლოდ მათემატიკიდან.
// წმინდა ფუნქციები — დავალებები დღის ნომრით დეტერმინისტულია (გადატვირთვისას არ იცვლება).
import type { Progress, Today } from '../core/types';
import type { ProductId } from '../config/economy';
import { cafeStats, scaledPrice } from './economy';

export type QuestId = 'sell' | 'sellProduct' | 'sides' | 'happy' | 'noWaste' | 'mathFirst' | 'change' | 'streak';

export interface Quest {
  id: QuestId;
  kind: 'business' | 'math';
  target: number;
  product?: ProductId;
  reward: { money?: number; stars?: number; points?: number };
  done: boolean;
}

/** ბიზნესის დავალების ფულადი ჯილდო (კლასის მასშტაბით, როგორც ფასები). */
export const QUEST_MONEY_BASE = 6;
export const QUEST_STARS = 2;
export const QUEST_POINTS = 15;

const SIDE_IDS: ProductId[] = ['juice', 'fries', 'icecream'];

/** მარტივი დეტერმინისტული „შემთხვევითობა" დღის ნომრიდან. */
function seeded(n: number) {
  let s = (n * 2654435761) >>> 0;
  return () => {
    s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0;
    return s / 4294967296;
  };
}

/** დღის დავალებები. seed = დღე + ისტორიის სიგრძე (განმეორებით დღეს სხვა დავალებები შეიძლება იყოს). */
export function pickQuests(p: Pick<Progress, 'day' | 'grade' | 'history' | 'owned' | 'menu' | 'cafeLevel' | 'branches'>): Quest[] {
  const rnd = seeded(p.day * 31 + p.history.length * 7 + 3);
  const stats = cafeStats(p as Progress);
  const customers = stats.customersPerDay;
  const menu = stats.menu;
  const money = scaledPrice(QUEST_MONEY_BASE, p.grade);
  const biz: Quest[] = [
    { id: 'sell', kind: 'business', target: Math.max(2, Math.round(customers * 0.6)), reward: { money }, done: false },
    { id: 'happy', kind: 'business', target: Math.max(2, Math.round(customers * 0.4)), reward: { money }, done: false },
    { id: 'noWaste', kind: 'business', target: Math.max(2, Math.round(customers * 0.5)), reward: { money }, done: false },
  ];
  const special = menu.filter((m) => m !== 'burger' && !SIDE_IDS.includes(m as ProductId)) as ProductId[];
  if (special.length) {
    const product = special[Math.floor(rnd() * special.length)];
    biz.push({ id: 'sellProduct', kind: 'business', target: 2, product, reward: { money }, done: false });
  }
  if (menu.some((m) => SIDE_IDS.includes(m as ProductId))) {
    biz.push({ id: 'sides', kind: 'business', target: 2, reward: { money }, done: false });
  }
  const stars = { stars: QUEST_STARS, points: QUEST_POINTS };
  const math: Quest[] = [
    { id: 'mathFirst', kind: 'math', target: p.grade === 1 ? 3 : 4, reward: stars, done: false },
    { id: 'change', kind: 'math', target: 2, reward: stars, done: false },
    { id: 'streak', kind: 'math', target: p.grade <= 2 ? 3 : 4, reward: stars, done: false },
  ];
  return [biz[Math.floor(rnd() * biz.length)], math[Math.floor(rnd() * math.length)]];
}

/** რამდენი შესრულდა ახლა. */
export function questValue(q: Quest, t: Today): number {
  switch (q.id) {
    case 'sell': return t.served;
    case 'sellProduct': return q.product ? t.sales[q.product] ?? 0 : 0;
    case 'sides': return SIDE_IDS.reduce((a, id) => a + (t.sales[id] ?? 0), 0);
    case 'happy': return t.happy ?? 0;
    // გადაყრის გარეშე: ყოველი მომსახურე კლიენტი ითვლება, სანამ არაფერი გადაგიყრია
    case 'noWaste': return t.wasted > 0 ? 0 : t.served;
    case 'mathFirst': return t.mathFirst ?? 0;
    case 'change': return t.changeFirst ?? 0;
    case 'streak': return t.bestStreak ?? 0;
  }
}

/** ახლად შესრულებული დავალებები — ჯილდო ერიცხება აქვე (p იცვლება). */
export function settleQuests(p: Progress): Quest[] {
  const t = p.today;
  if (!t?.quests) return [];
  const fresh: Quest[] = [];
  for (const q of t.quests) {
    if (q.done || questValue(q, t) < q.target) continue;
    q.done = true;
    p.money += q.reward.money ?? 0;
    p.stars += q.reward.stars ?? 0;
    p.points += q.reward.points ?? 0;
    fresh.push(q);
  }
  return fresh;
}

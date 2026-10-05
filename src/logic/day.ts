// დღის ციკლი: დილის საწყობი → სამუშაო დღე → საღამოს ანგარიში.
// წმინდა ფუნქციები (UI-ს გარეშე) — ტესტირებადი.
import type { Grade, Progress, Today } from '../core/types';
import { BRANCH_INCOME, PRODUCTS, RENT_BASE, RENT_LEVEL, SIDE_STOCK, STOCK, type ProductId, type StockId } from '../config/economy';
import { EMERGENCY, RECIPES, SERVICE, type BurgerId } from '../config/service';
import { cafeStats, scaledPrice } from './economy';
import { bump, touchPlayDate } from './badges';
import { pickQuests } from './quests';

const BURGERS: BurgerId[] = ['burger', 'cheeseburger', 'double'];

/** ქირა და კომუნალური ერთ დღეზე. */
export function rentFor(p: Pick<Progress, 'grade' | 'cafeLevel'>): number {
  return Math.round(RENT_BASE[p.grade] * RENT_LEVEL[Math.min(4, Math.max(1, p.cafeLevel))]);
}

/** რომელი ინგრედიენტებია საჭირო მიმდინარე მენიუსთვის. */
export function neededStock(menu: readonly string[]): StockId[] {
  const s = new Set<StockId>(['bun']);
  for (const b of BURGERS) {
    if (!menu.includes(b)) continue;
    for (const v of RECIPES[b]) for (const l of v) s.add(l as StockId);
  }
  for (const side of ['juice', 'fries', 'icecream'] as const) if (menu.includes(side)) s.add(SIDE_STOCK[side]);
  return (Object.keys(STOCK) as StockId[]).filter((id) => s.has(id));
}

/** დაახლოებით რამდენი ცალი დასჭირდება დღეს (კლიენტების რაოდენობით). */
export function forecast(menu: readonly string[], customers: number): Record<StockId, number> {
  const out = Object.fromEntries(Object.keys(STOCK).map((k) => [k, 0])) as Record<StockId, number>;
  const burgers = BURGERS.filter((b) => menu.includes(b));
  const sides = (['juice', 'fries', 'icecream'] as const).filter((s) => menu.includes(s));
  for (const b of burgers) {
    const share = 1 / burgers.length;
    out.bun += share;
    for (const v of RECIPES[b]) for (const l of v) out[l as StockId] += share / RECIPES[b].length;
  }
  for (const s of sides) out[SIDE_STOCK[s]] += (SERVICE.sideChance * 1.4) / sides.length;
  for (const k of Object.keys(out) as StockId[]) out[k] = Math.ceil(out[k] * customers);
  return out;
}

/** დღის მიზანი (შემოსავალი ₾). */
export function dayGoal(p: Progress): number {
  const st = cafeStats(p);
  const burgers = st.menu.filter((m): m is BurgerId => (BURGERS as string[]).includes(m));
  const avg = burgers.reduce((a, b) => a + PRODUCTS[b].prices[p.grade][0], 0) / Math.max(1, burgers.length);
  return Math.max(1, Math.round(st.customersPerDay * avg * SERVICE.goalShare));
}

/** ახალი დღის დაწყება (ან იმავე დღის გაგრძელება, თუ უკვე დაწყებულია). */
export function ensureToday(p: Progress): Today {
  // ნათამაშები დღეც იგივე დღეა, სანამ ანგარიში არ დასრულდება (finishDay → today = null)
  if (p.today && p.today.day === p.day) {
    // განახლებამდე დაწყებულ დღეს დავალებები ჯერ არ ჰქონდა
    if (!p.today.quests && !p.today.played) p.today.quests = pickQuests(p);
    return p.today;
  }
  p.today = {
    day: p.day, goal: dayGoal(p), rent: rentFor(p), purchases: [], ingredients: 0, sales: {},
    revenue: 0, tips: 0, served: 0, left: 0, wasted: 0, startStars: p.stars, played: false, grade: p.grade,
    quests: pickQuests(p),
  };
  return p.today;
}

export type Cart = Partial<Record<StockId, number>>;

export const cartCost = (cart: Cart, grade: Grade) =>
  (Object.entries(cart) as [StockId, number][]).reduce((a, [id, packs]) => a + packs * STOCK[id].price[grade], 0);

/** ყიდვა საწყობში: ფული მცირდება, მარაგი იზრდება, ხარჯი ჩაიწერება. */
export function buyPacks(p: Progress, cart: Cart): number {
  const cost = cartCost(cart, p.grade);
  if (cost > p.money) throw new Error('not enough money');
  const today = ensureToday(p);
  for (const [id, packs] of Object.entries(cart) as [StockId, number][]) {
    if (!packs) continue;
    p.stock[id] = (p.stock[id] ?? 0) + packs * STOCK[id].pack;
    today.purchases.push({ id, packs, cost: packs * STOCK[id].price[p.grade] });
  }
  today.ingredients += cost;
  p.money -= cost;
  return cost;
}

/** სასწრაფო მიწოდების ფასი ერთ შეკვრაზე (დილის ფასზე ძვირი). */
export const emergencyPrice = (id: StockId, grade: Grade) => Math.ceil(STOCK[id].price[grade] * EMERGENCY.markup);

/** სასწრაფო შეკვეთა: ფული ახლავე იხდება, მარაგი კურიერის მოსვლისას ემატება (receiveDelivery). */
export function buyEmergency(p: Progress, id: StockId, packs: number): number {
  const t = ensureToday(p);
  const cost = packs * emergencyPrice(id, t.grade ?? p.grade);
  if (packs < 1 || cost > p.money) throw new Error('cannot buy');
  t.purchases.push({ id, packs, cost, emergency: true });
  t.ingredients += cost;
  p.money -= cost;
  return cost;
}

export function receiveDelivery(p: Progress, id: StockId, packs: number) {
  p.stock[id] = (p.stock[id] ?? 0) + packs * STOCK[id].pack;
}

/** ამოწურვის ჩაწერა (საღამოს რჩევისთვის და მეორე დილის მინიშნებისთვის). */
export function noteStockout(p: Progress, id: StockId) {
  const t = ensureToday(p);
  t.stockouts ??= [];
  if (!t.stockouts.includes(id)) t.stockouts.push(id);
}

/** ინგრედიენტის დახარჯვა (false — მარაგი ამოიწურა). */
export function consume(p: Progress, id: StockId, n = 1): boolean {
  if ((p.stock[id] ?? 0) < n) return false;
  p.stock[id] -= n;
  return true;
}

/** გაყიდვის ჩაწერა. */
export function recordSale(p: Progress, products: ProductId[], paid: number, tip: number) {
  const t = ensureToday(p);
  for (const id of products) t.sales[id] = (t.sales[id] ?? 0) + 1;
  bump(p, 'burgers');
  bump(p, 'served');
  t.revenue += paid + tip;
  t.tips += tip;
  t.served += 1;
}

/** მეორე ფილიალის დღიური შემოსავალი (0 — თუ ფილიალი ჯერ არ არის). */
export function branchIncome(p: Pick<Progress, 'branches' | 'grade'>): number {
  return p.branches > 1 ? scaledPrice(BRANCH_INCOME, p.grade) : 0;
}

/** სამუშაო დღის დასასრული: წასული კლიენტები, მეორე ფილიალის შემოსავალი, ანგარიში ელოდება. */
export function closeService(p: Progress, left: number, missed = 0) {
  const t = ensureToday(p);
  if (t.played) return; // დასრულებული დღე მეორედ არ იხურება
  // დღე შეიძლება რამდენიმე ნაწილად ითამაშოს (გვერდის გადატვირთვა) — ვამატებთ
  t.left = (t.left ?? 0) + left;
  t.missed = (t.missed ?? 0) + missed;
  t.played = true;
  const b = branchIncome(p);
  if (b && !t.branch) {
    t.branch = b;
    t.revenue += b;
    p.money += b;
  }
}

export interface ReportRow { id: string; qty: number; price: number; sum: number; emergency?: boolean }
export interface Report {
  revenueRows: ReportRow[];
  tips: number;
  branch: number;     // მეორე ფილიალი
  discount: number;   // აქციის ფასდაკლება (გამოაკლდება შემოსავალს)
  revenue: number;
  expenseRows: ReportRow[];
  rent: number;
  ingredients: number;
  expenses: number;
  profit: number;     // შეიძლება უარყოფითიც იყოს — ზარალი
}

/** საღამოს ანგარიშის ციფრები ჩანაწერებიდან. */
export function makeReport(t: Today, grade: Grade): Report {
  const revenueRows = (Object.entries(t.sales) as [ProductId, number][])
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ id, qty, price: PRODUCTS[id].prices[grade][0], sum: qty * PRODUCTS[id].prices[grade][0] }));
  const rowsTotal = revenueRows.reduce((a, r) => a + r.sum, 0);
  const branch = t.branch ?? 0;
  const discount = Math.max(0, rowsTotal + t.tips + branch - t.revenue);
  const expenseRows = t.purchases.map((x) => ({ id: x.id, qty: x.packs, price: x.cost / x.packs, sum: x.cost, emergency: x.emergency }));
  const expenses = t.ingredients + t.rent;
  return { revenueRows, tips: t.tips, branch, discount, revenue: t.revenue, expenseRows, rent: t.rent, ingredients: t.ingredients, expenses, profit: t.revenue - expenses };
}

/** დღის დასრულება: ქირის გადახდა, ისტორია, შემდეგი დღე (მხოლოდ მიზნის შესრულებისას). */
export function finishDay(p: Progress, now = new Date()): { goalMet: boolean; report: Report } {
  const t = ensureToday(p);
  const report = makeReport(t, t.grade ?? p.grade);
  const goalMet = t.revenue >= t.goal;
  p.money = Math.max(0, p.money - t.rent);
  p.lastStockouts = [...(t.stockouts ?? [])];
  p.history.push({
    day: t.day, revenue: report.revenue, expenses: report.expenses, profit: report.profit,
    customers: t.served, stars: p.stars - t.startStars, date: new Date().toISOString(),
  });
  if (goalMet) { p.day += 1; bump(p, 'goals'); }
  if (report.profit > 0) bump(p, 'profit_total', report.profit);
  touchPlayDate(p, now);
  p.today = null;
  return { goalMet, report };
}

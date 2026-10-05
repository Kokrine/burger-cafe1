// შეკვეთები და ბურგერის აწყობის შემოწმება (წმინდა ფუნქციები, ტესტირებადი).
import { RECIPES, SIDES, SERVICE, type BurgerId, type Ingredient, type Layer, type Side } from '../config/service';
import { SIDE_STOCK, type ProductId } from '../config/economy';

export interface Order {
  burger: BurgerId;
  layers: Layer[];   // სრული დასტა ქვემოდან ზემოთ, ფუნთუშებით
  sides: Side[];
}

/** sideQty — ერთი სახის გვერდითი კერძის მაქს. რაოდენობა (2+ კლასში — გამრავლებისთვის). */
export function makeOrder(menu: readonly string[], rnd: () => number = Math.random, sideQty = 1): Order {
  const burgers = (['burger', 'cheeseburger', 'double'] as BurgerId[]).filter((b) => menu.includes(b));
  const burger = burgers[Math.floor(rnd() * burgers.length)] ?? 'burger';
  const variants = RECIPES[burger];
  const mid = variants[Math.floor(rnd() * variants.length)];
  const sides: Side[] = [];
  const avail = SIDES.filter((s) => menu.includes(s));
  if (avail.length && rnd() < SERVICE.sideChance) {
    const side = avail[Math.floor(rnd() * avail.length)];
    const qty = 1 + Math.floor(rnd() * sideQty);
    for (let i = 0; i < qty; i++) sides.push(side);
  }
  return { burger, layers: ['bun_bottom', ...mid, 'bun_top'], sides };
}

/** რამდენი ცალი სჭირდება შეკვეთას თითოეული ინგრედიენტიდან (ფუნთუშა — 1 ბურგერზე). */
export function needsOf(layers: readonly Layer[], sides: readonly Side[]): Record<string, number> {
  const n: Record<string, number> = {};
  const add = (id: string) => { n[id] = (n[id] ?? 0) + 1; };
  for (const l of layers) {
    if (l === 'bun_top') continue;
    add(l === 'bun_bottom' ? 'bun' : l);
  }
  for (const s of sides) add(SIDE_STOCK[s]);
  return n;
}

export const canMake = (layers: readonly Layer[], sides: readonly Side[], have: (id: string) => number) =>
  Object.entries(needsOf(layers, sides)).every(([id, k]) => have(id) >= k);

/**
 * შეკვეთა მხოლოდ იმისგან, რისი გაკეთებაც ახლა შეიძლება (მარაგის მიხედვით).
 * null — თუ არცერთი ბურგერი აღარ კეთდება (მაგ. ფუნთუშა ან კოტლეტი ამოიწურა).
 */
export function makeFeasibleOrder(menu: readonly string[], have: (id: string) => number, rnd: () => number = Math.random, sideQty = 1): Order | null {
  const options: { burger: BurgerId; mid: Layer[] }[] = [];
  for (const b of ['burger', 'cheeseburger', 'double'] as BurgerId[]) {
    if (!menu.includes(b)) continue;
    for (const mid of RECIPES[b]) if (canMake(['bun_bottom', ...mid], [], have)) options.push({ burger: b, mid });
  }
  if (!options.length) return null;
  const pick = options[Math.floor(rnd() * options.length)];
  const layers: Layer[] = ['bun_bottom', ...pick.mid, 'bun_top'];
  const sides: Side[] = [];
  const avail = SIDES.filter((s) => menu.includes(s) && have(SIDE_STOCK[s]) > 0);
  if (avail.length && rnd() < SERVICE.sideChance) {
    const side = avail[Math.floor(rnd() * avail.length)];
    const qty = Math.min(1 + Math.floor(rnd() * sideQty), have(SIDE_STOCK[side]));
    for (let i = 0; i < qty; i++) sides.push(side);
  }
  return { burger: pick.burger, layers, sides };
}

/** ყუთზე დაჭერა → რომელი ფენა დაემატება თეფშზე (ფუნთუშა: ქვედა ან ზედა). */
export function layerFor(ing: Ingredient, plate: readonly Layer[]): Layer {
  if (ing === 'bun') return plate.length === 0 ? 'bun_bottom' : 'bun_top';
  return ing;
}

/** შეიძლება თუ არა ამ ფენის დამატება: უნდა ემთხვეოდეს რომელიმე შეკვეთის შემდეგ ფენას. */
export function canAdd(layer: Layer, plate: readonly Layer[], orders: readonly Order[]): boolean {
  if (plate.at(-1) === 'bun_top') return false;
  const next = [...plate, layer];
  return orders.some((o) => next.every((l, i) => o.layers[i] === l));
}

export const burgerDone = (plate: readonly Layer[]) => plate.length >= 2 && plate.at(-1) === 'bun_top';

/** შეკვეთა ზუსტად ემთხვევა თუ არა თეფშს და ლანგარს. */
export function matches(order: Order, plate: readonly Layer[], tray: readonly Side[]): boolean {
  if (plate.length !== order.layers.length || plate.some((l, i) => l !== order.layers[i])) return false;
  const a = [...order.sides].sort(), b = [...tray].sort();
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

/** შეკვეთის პროდუქტები ფასის დასათვლელად. */
export const orderProducts = (o: Order): ProductId[] => [o.burger, ...o.sides];

/** რომელი ინგრედიენტებია საჭირო მიმდინარე მენიუსთვის (დანარჩენი ყუთები ნაცრისფერია). */
export function usedIngredients(menu: readonly string[]): Set<Ingredient> {
  const s = new Set<Ingredient>(['bun']);
  for (const b of ['burger', 'cheeseburger', 'double'] as BurgerId[]) {
    if (!menu.includes(b)) continue;
    for (const v of RECIPES[b]) for (const l of v) s.add(l as Ingredient);
  }
  return s;
}

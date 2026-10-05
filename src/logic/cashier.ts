// სალაროს ამოცანების შერჩევა შეკვეთისთვის (კლასი + ადაპტური დონე).
// 1) ჯამი — თუ შეკვეთაში რამდენიმე პროდუქტია ან რაოდენობა (გამრავლება);
// 2) ხურდა (მონეტების არჩევით) ან ანგარიშის თანაბრად გაყოფა.
import type { Grade, Op } from '../core/types';
import { DIFFICULTY } from '../config/difficulty';
import { PRODUCTS, type ProductId } from '../config/economy';
import type { Order } from './orders';
import type { Problem } from './math/types';
import { changeProblem, linePay, shareProblem, sumProblem, type Line } from './math/generator';

export interface CashierPlan { problems: Problem[]; total: number; promo: boolean }

export function orderLines(order: Order, grade: Grade, names: Record<string, string>): Line[] {
  const ids: ProductId[] = [order.burger, ...order.sides];
  const lines: Line[] = [];
  for (const id of ids) {
    const l = lines.find((x) => x.name === names[id]);
    if (l) l.qty += 1;
    else lines.push({ name: names[id], qty: 1, price: PRODUCTS[id].prices[grade][0], icon: PRODUCTS[id].icon });
  }
  return lines;
}

export function cashierPlan(order: Order, grade: Grade, levels: Record<Op, number>, names: Record<string, string>, rnd: () => number = Math.random): CashierPlan {
  const lines = orderLines(order, grade, names);
  const promoLine = DIFFICULTY[grade].discount ? lines.findIndex((l) => l.qty === 3) : -1;
  const promo = promoLine >= 0 && rnd() < 0.6;
  const total = lines.reduce((a, l, i) => a + linePay(l, promo && i === promoLine), 0);
  const problems: Problem[] = [];
  if (lines.length > 1 || lines.some((l) => l.qty > 1)) problems.push(sumProblem(lines, grade, rnd, promo ? promoLine : -1));
  const items = lines.reduce((a, l) => a + l.qty, 0);
  const share = rnd() < 0.2 + levels.div * 0.06 ? shareProblem(total, grade, rnd, items) : null;
  const second = share ?? changeProblem(total, grade, levels.sub, rnd);
  if (second) problems.push(second);
  return { problems, total, promo };
}

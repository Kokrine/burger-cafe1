// მათემატიკის გენერატორი. ყოველი ამოცანა კაფეს რეალური საჭიროებაა:
// ყიდვა, სალარო (ჯამი, ხურდა, ანგარიშის გაყოფა), სამზარეულო და საწყობი.
// წესები (მოწმდება ტესტებით): პასუხი მთელია და არაუარყოფითი, გაყოფა ნაშთის
// გარეშეა (გარდა 4 კლასის ნაშთიანი ამოცანისა), რიცხვები კლასის ფარგლებშია.
import type { Grade, Op } from '../../core/types';
import { ADAPTIVE, DIFFICULTY, PAY_BILLS } from '../../config/difficulty';
import type { Hint, Problem, Step } from './types';
import { additionSteps, divisionSteps, multiplicationSteps, subtractionSteps } from './steps';

type Rnd = () => number;
const rint = (lo: number, hi: number, rnd: Rnd) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(a: readonly T[], rnd: Rnd): T => a[Math.floor(rnd() * a.length)];

export const gradeMax = (g: Grade) => DIFFICULTY[g].max;
export const allows = (g: Grade, op: Op) => DIFFICULTY[g].ops.includes(op);

// ---------------- ადაპტური სირთულე ----------------

export interface AdaptiveState { level: number; run: number; recent: boolean[] }
export const newAdaptive = (): AdaptiveState => ({ level: ADAPTIVE.start, run: 0, recent: [] });

/** პასუხის შემდეგ: 5 ზედიზედ სწორი → დონე +1; ბოლო 6-ში 2 შეცდომა → დონე −1. */
export function updateAdaptive(s: AdaptiveState, firstTry: boolean): AdaptiveState {
  const recent = [...s.recent, firstTry].slice(-ADAPTIVE.window);
  let { level, run } = s;
  run = firstTry ? run + 1 : 0;
  if (run >= ADAPTIVE.upAfter) {
    level = Math.min(ADAPTIVE.levels - 1, level + 1);
    run = 0;
  }
  if (recent.filter((x) => !x).length >= ADAPTIVE.downAfterErrors) {
    level = Math.max(0, level - 1);
    return { level, run: 0, recent: [] };
  }
  return { level, run, recent };
}

// ---------------- დამხმარეები ----------------

/** 3 განსხვავებული არაუარყოფითი ვარიანტი, ერთ-ერთი სწორია (1 კლასი). */
export function makeChoices(answer: number, rnd: Rnd = Math.random): number[] {
  const set = new Set<number>([answer]);
  const deltas = [1, -1, 2, -2, 3, 10, -10].sort(() => rnd() - 0.5);
  for (const d of deltas) {
    if (set.size >= 3) break;
    if (answer + d >= 0) set.add(answer + d);
  }
  return [...set].sort(() => rnd() - 0.5);
}

function finalize(p: Omit<Problem, 'input'>, grade: Grade, rnd: Rnd, input?: Problem['input']): Problem {
  const mode = input ?? DIFFICULTY[grade].answer;
  return { ...p, input: mode, choices: mode === 'choice' ? makeChoices(p.answer, rnd) : undefined };
}

function subHint(a: number, b: number): Hint {
  if (a <= 20) return { type: 'coins', groups: [a], crossed: b };
  if (a <= 100) return { type: 'line', from: b, to: a };
  return { type: 'place', top: a, bottom: b, sign: '−' };
}

function addHint(terms: number[]): Hint {
  const total = terms.reduce((x, y) => x + y, 0);
  if (total <= 20) return { type: 'coins', groups: terms };
  if (total <= 100) return { type: 'line', from: terms[0], to: total };
  return { type: 'place', top: terms[0], bottom: total - terms[0], sign: '+' };
}

// ---------------- მაღაზია: ყიდვა ----------------

/**
 * „გაქვს X ₾, ნივთი Y ₾ ღირს, რამდენი დაგრჩება?" თუ ბალანსი კლასის ფარგლებს
 * სცდება — ხურდა კუპიურიდან, ან კუპიურების დათვლა.
 */
export function purchaseProblem(balance: number, price: number, item: string, grade: Grade, rnd: Rnd = Math.random): Problem {
  const max = gradeMax(grade);
  if (balance <= max) {
    return finalize({ kind: 'remain', vars: { a: balance, b: price, item }, op: 'sub', answer: balance - price, steps: subtractionSteps(balance, price), hint: subHint(balance, price) }, grade, rnd);
  }
  const bill = price < max ? [...PAY_BILLS, 1000, 5000].find((b) => b > price && b <= max) : undefined;
  if (bill) {
    return finalize({ kind: 'payChange', vars: { a: bill, b: price, item }, op: 'sub', answer: bill - price, steps: subtractionSteps(bill, price), hint: subHint(bill, price) }, grade, rnd);
  }
  const d = [1000, 500, 100, 50, 10, 5].find((x) => price % x === 0 && price / x <= max && price / x >= 2) ?? price;
  const n = price / d;
  const steps = n <= 6
    ? Array.from({ length: Math.min(n, 3) }, (_, i) => n - Math.min(n, 3) + i + 1).map((k) => ({ expr: Array(k).fill(d).join(' + '), value: d * k }))
    : [{ expr: `${price} ÷ ${d}`, value: n }, { expr: `${n} × ${d}`, value: price }];
  return finalize({ kind: 'bills', vars: { a: price, b: d, b2: d * 2, b3: d * 3, item }, op: grade === 1 ? 'add' : 'div', answer: n, steps, hint: { type: 'bills', denom: d, count: n } }, grade, rnd);
}

// ---------------- სალარო ----------------

export interface Line { name: string; qty: number; price: number; icon: string }

/** რამდენს იხდის ხაზზე (აქციით: 3 ცალი 2-ის ფასად). */
export const linePay = (l: Line, promo: boolean) => (promo && l.qty === 3 ? 2 : l.qty) * l.price;

/** შეკვეთის ჯამი: „2 წვენი × 3 ₾ + ბურგერი 8 ₾ = ?" */
export function sumProblem(lines: Line[], grade: Grade, rnd: Rnd = Math.random, promoLine = -1): Problem {
  const promo = promoLine >= 0;
  const totals = lines.map((l, i) => linePay(l, i === promoLine));
  const answer = totals.reduce((a, b) => a + b, 0);
  const items = lines.map((l) => (l.qty > 1 ? `${l.qty} ${l.name} × ${l.price} ₾` : `${l.name} ${l.price} ₾`)).join(' + ');
  const steps: Step[] = [];
  lines.forEach((l, i) => {
    const q = i === promoLine ? 2 : l.qty;
    if (q > 1) steps.push(...multiplicationSteps(q, l.price));
  });
  if (totals.length > 1) steps.push(...additionSteps(totals));
  const mulLine = lines.findIndex((l) => l.qty > 1);
  const op: Op = mulLine >= 0 ? 'mul' : 'add';
  const hint: Hint = mulLine >= 0
    ? { type: 'groups', groups: mulLine === promoLine ? 2 : lines[mulLine].qty, size: lines[mulLine].price, icon: 'coin' }
    : addHint(totals);
  return finalize({
    kind: promo ? 'sumPromo' : 'sum',
    vars: { items, promo: promo ? lines[promoLine].name : '' },
    op, answer, steps: steps.length ? steps : [{ expr: items, value: answer }], hint,
  }, grade, rnd);
}

/** კლიენტის კუპიურა: მაღალ დონეზე ზოგჯერ უფრო დიდი (ხურდა რთულდება). */
export function payBill(total: number, grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): number | null {
  const ok = PAY_BILLS.filter((b) => b > total && b <= gradeMax(grade));
  if (!ok.length) return null;
  return level >= 3 && ok.length > 1 && rnd() < 0.5 ? ok[1] : ok[0];
}

/** ხურდა მონეტებისა და კუპიურების არჩევით. null — თუ კლიენტი ზუსტად იხდის. */
export function changeProblem(total: number, grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem | null {
  const bill = payBill(total, grade, level, rnd);
  if (!bill) return null;
  const answer = bill - total;
  const denoms = DIFFICULTY[grade].denoms.filter((d) => d <= answer);
  return {
    kind: 'change', vars: { a: bill, b: total }, op: 'sub', answer, input: 'change', denoms: denoms.length ? denoms : [1],
    steps: subtractionSteps(bill, total), hint: subHint(bill, total),
  };
}

/** „3 მეგობარი ანგარიშს თანაბრად იყოფს: 18 ₾" — null, თუ თანაბრად არ იყოფა. */
export function shareProblem(total: number, grade: Grade, rnd: Rnd = Math.random): Problem | null {
  if (!allows(grade, 'div')) return null;
  const opts = DIFFICULTY[grade].divisors.filter((n) => total % n === 0 && total / n >= 1);
  if (!opts.length) return null;
  const n = pick(opts, rnd);
  return finalize({
    kind: 'share', vars: { n, total }, op: 'div', answer: total / n,
    steps: divisionSteps(total, n), hint: { type: 'share', total, parts: n, icon: 'coin' },
  }, grade, rnd);
}

// ---------------- სამზარეულო / საწყობი ----------------

/** „12 კოტლეტი 4 თეფშზე თანაბრად" (4 კლასში ზოგჯერ ნაშთით: „რამდენი დარჩება?"). */
export function groupProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem | null {
  const conf = DIFFICULTY[grade];
  if (!allows(grade, 'div') || !conf.divisors.length) return null;
  const n = pick(conf.divisors, rnd);
  const qCap = grade === 4 ? 12 + level * 4 : grade === 3 ? 10 : 5 + level;
  const qMax = Math.max(2, Math.min(qCap, Math.floor((conf.max * ADAPTIVE.range[level]) / n)));
  const q = rint(2, qMax, rnd);
  const withRem = conf.remainder && rnd() < 0.5;
  const r = withRem ? rint(1, n - 1, rnd) : 0;
  const total = n * q + r;
  return finalize({
    kind: withRem ? 'groupRem' : 'group', vars: { total, n }, op: 'div', answer: withRem ? r : q,
    steps: divisionSteps(total, n), hint: { type: 'share', total, parts: n, icon: 'grill_patty_ready' },
  }, grade, rnd);
}

/** საწყობი: „ერთი შეკვრა 3 ₾ ღირს, 4 შეკვრა გჭირდება — რამდენს გადაიხდი?" */
export function packsProblem(qty: number, price: number, item: string, grade: Grade, rnd: Rnd = Math.random): Problem {
  const answer = qty * price;
  const asAdd = !allows(grade, 'mul');
  return finalize({
    kind: 'packs', vars: { item, qty, price }, op: asAdd ? 'add' : 'mul', answer,
    steps: asAdd ? additionSteps(Array(qty).fill(price)) : multiplicationSteps(qty, price),
    hint: { type: 'groups', groups: qty, size: price, icon: 'coin' },
  }, grade, rnd);
}

/** საწყობი: „ბიუჯეტი 50 ₾, დახარჯე 32 ₾ — რამდენი დაგრჩა?" */
export function budgetProblem(budget: number, spent: number, grade: Grade, rnd: Rnd = Math.random): Problem {
  return finalize({
    kind: 'budget', vars: { a: budget, b: spent }, op: 'sub', answer: budget - spent,
    steps: subtractionSteps(budget, spent), hint: subHint(budget, spent),
  }, grade, rnd);
}

/** გვერდითი კერძის მაქსიმალური რაოდენობა შეკვეთაში (კლასი + ადაპტური დონე). */
export function sideQtyMax(grade: Grade, level = ADAPTIVE.start): number {
  const conf = DIFFICULTY[grade];
  if (!allows(grade, 'mul')) return 1;
  return Math.max(1, Math.min(conf.qtyMax, level <= 1 ? 2 : conf.qtyMax));
}

export { rint, pick };

// ---------------- საღამოს ანგარიში ----------------

/**
 * შემოსავალი/ხარჯი = ჩანაწერების ჯამი. null — თუ ჯამი კლასის ფარგლებს სცდება
 * (მაშინ ციფრს თამაში თვითონ აჩვენებს და ბავშვს არ ეკითხება).
 */
export function listSumProblem(terms: number[], kind: 'revenue' | 'expenses', grade: Grade, rnd: Rnd = Math.random): Problem | null {
  const t = terms.filter((x) => x > 0);
  const answer = t.reduce((a, b) => a + b, 0);
  // ერთი რიცხვი შესაკრები არ არის („შეკრიბე: 5") — ანგარიში თავად ჩაიწერება
  if (t.length < 2 || answer > gradeMax(grade)) return null;
  return finalize({
    kind, vars: { items: t.join(' + ') }, op: 'add', answer,
    steps: additionSteps(t), hint: addHint(t),
  }, grade, rnd);
}

/** მოგება = შემოსავალი − ხარჯი; თუ ხარჯი მეტია — ზარალი = ხარჯი − შემოსავალი. */
export function profitProblem(revenue: number, expenses: number, grade: Grade, rnd: Rnd = Math.random): Problem | null {
  const max = gradeMax(grade);
  if (revenue > max || expenses > max) return null;
  const loss = expenses > revenue;
  const [a, b] = loss ? [expenses, revenue] : [revenue, expenses];
  return finalize({
    kind: loss ? 'loss' : 'profit', vars: { a: revenue, b: expenses }, op: 'sub', answer: a - b,
    steps: subtractionSteps(a, b), hint: subHint(a, b),
  }, grade, rnd);
}

// ---------------- დრო და წილადები (დილის მომზადება) ----------------

const two = (n: number) => String(n).padStart(2, '0');

/** დღის სამუშაო საათები [გახსნა, დახურვა] (1 კლასში — პატარა რიცხვებით). */
export function dayHours(grade: Grade, rnd: Rnd = Math.random): [number, number] {
  const open = grade === 1 ? rint(8, 10, rnd) : rint(7, 11, rnd);
  const close = grade === 1 ? open + rint(2, 5, rnd) : rint(Math.max(open + 3, 14), 21, rnd);
  return [open, close];
}

/** „კაფე 9:00-დან 13:00-მდე მუშაობს — რამდენი საათი?" hours — დღის საათები (სამუშაო დღის საათიც მათ აჩვენებს). */
export function hoursProblem(grade: Grade, rnd: Rnd = Math.random, hours: [number, number] = dayHours(grade, rnd)): Problem {
  const [open, close] = hours;
  return finalize({
    kind: 'hours', vars: { open: `${open}:00`, close: `${close}:00` }, op: 'sub', answer: close - open,
    steps: [{ expr: `${close} − ${open}`, value: close - open }], hint: { type: 'line', from: open, to: close },
  }, grade, rnd);
}

/** „კოტლეტი 10:50-ზე დადე, 11:05-ზე მზად იყო — რამდენი წუთი იწვებოდა?" (3–4 კლასი, საათის გადაკვეთით). */
export function cookTimeProblem(grade: Grade, rnd: Rnd = Math.random): Problem | null {
  if (grade < 3) return null;
  const h = rint(9, 16, rnd);
  const m0 = pick([30, 35, 40, 45, 50, 55], rnd);
  const dur = pick(grade === 4 ? [15, 20, 25, 30, 35, 40] : [10, 15, 20, 25], rnd);
  const end = m0 + dur;
  const h1 = h + Math.floor(end / 60), m1 = end % 60;
  const toHour = 60 - m0;
  const steps: Step[] = end >= 60
    ? [{ expr: `60 − ${m0}`, value: toHour }, { expr: `${toHour} + ${m1}`, value: dur }]
    : [{ expr: `${m1} − ${m0}`, value: dur }];
  return finalize({
    kind: 'cookTime', vars: { start: `${h}:${two(m0)}`, end: `${h1}:${two(m1)}` }, op: 'sub', answer: dur,
    steps, hint: { type: 'line', from: m0, to: end },
  }, grade, rnd);
}

/** წილადები, რომლებსაც კლასი სწავლობს: [მრიცხველი, მნიშვნელი]. */
const FRACTIONS: Record<number, [number, number][]> = {
  3: [[1, 2], [1, 3], [1, 4]],
  4: [[1, 2], [1, 3], [1, 4], [3, 4], [2, 3], [1, 5]],
};

/** „12 ფუნთუშის მეოთხედი (¼) — რამდენია?" (3–4 კლასი). */
export function fractionProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem | null {
  const list = FRACTIONS[grade];
  if (!list) return null;
  const [num, den] = pick(list, rnd);
  const unit = rint(2, grade === 4 ? 6 + level * 2 : 4 + level, rnd); // ერთი წილის ზომა
  const total = unit * den;
  const answer = unit * num;
  const steps: Step[] = [{ expr: `${total} ÷ ${den}`, value: unit }];
  if (num > 1) steps.push({ expr: `${unit} × ${num}`, value: answer });
  return finalize({
    kind: 'fraction', vars: { total, frac: FRACTION_WORDS[`${num}/${den}`] ?? `${num}/${den}` }, op: 'div', answer,
    steps, hint: { type: 'share', total, parts: den, icon: 'layer_bun_top' },
  }, grade, rnd);
}

/** წილადის სიტყვიერი სახელი (სიმბოლოთი) — ხმით კითხვისთვისაც გასაგებია. */
export const FRACTION_WORDS: Record<string, string> = {
  '1/2': 'ნახევარი (½)', '1/3': 'მესამედი (⅓)', '1/4': 'მეოთხედი (¼)', '1/5': 'მეხუთედი (⅕)',
  '3/4': 'სამი მეოთხედი (¾)', '2/3': 'ორი მესამედი (⅔)',
};

/** დილის მომზადების ამოცანა: სახეობა კლასის მიხედვით (გაყოფა, საათები, წუთები, წილადები). */
export function prepProblem(grade: Grade, levels: { sub: number; div: number }, rnd: Rnd = Math.random, hours?: [number, number]): Problem | null {
  const options: (() => Problem | null)[] = [() => hoursProblem(grade, rnd, hours)];
  if (allows(grade, 'div')) options.push(() => groupProblem(grade, levels.div, rnd), () => groupProblem(grade, levels.div, rnd));
  if (grade >= 3) options.push(() => cookTimeProblem(grade, rnd), () => fractionProblem(grade, levels.div, rnd));
  return pick(options, rnd)();
}

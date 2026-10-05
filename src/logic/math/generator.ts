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

/**
 * კლიენტის კუპიურა: ხშირად უახლოესი, მაგრამ ზოგჯერ უფრო დიდი — ხურდა ყოველ ჯერზე სხვაა
 * (1 კლასში ფასი მხოლოდ 3 ან 5 ₾-ია და ადრე ყოველთვის „5 − 3 = 2" გამოდიოდა). დონესთან ერთად ხშირდება.
 */
export function payBill(total: number, grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): number | null {
  const ok = PAY_BILLS.filter((b) => b > total && b <= gradeMax(grade));
  if (!ok.length) return null;
  const r = rnd();
  if (ok.length > 2 && level >= 3 && r < 0.15) return ok[2];
  return ok.length > 1 && r < 0.25 + 0.1 * level ? ok[1] : ok[0];
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

// ---------------- დილის მომზადება: შეკრება, გამოკლება, მიმდევრობა, გამრავლება ----------------

/** რიცხვების ზედა ზღვარი კლასისა და ადაპტური დონის მიხედვით. */
const cap = (grade: Grade, level: number) => Math.max(10, Math.floor(gradeMax(grade) * ADAPTIVE.range[level]));

/** კაფესთვის დამაჯერებელი ზღვარი: 4 კლასშიც „5400 კლიენტი დღეში" არ უნდა ეწეროს. */
const real = (grade: Grade, level: number, limit: number) => Math.min(cap(grade, level), limit);

/** „გუშინ 12 კლიენტი მოვიდა, დღეს 5-ით მეტს ელოდები — რამდენი?" */
export function customersProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const c = real(grade, level, 500);
  const a = rint(Math.max(2, Math.floor(c * 0.25)), Math.floor(c * 0.6), rnd);
  const b = rint(1, Math.max(1, Math.min(c - a, Math.floor(c * 0.4))), rnd);
  return finalize({ kind: 'customers', vars: { a, b }, op: 'add', answer: a + b, steps: additionSteps([a, b]), hint: addHint([a, b]) }, grade, rnd);
}

const STOCK_WORDS = ['ფუნთუშა', 'კოტლეტი', 'პომიდორი', 'ყველის ნაჭერი', 'წვენის ბოთლი'];

/** „საწყობში 18 ფუნთუშა იყო, 7 გამოიყენე — რამდენი დარჩა?" */
export function stockLeftProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const c = real(grade, level, 600);
  const a = rint(Math.max(3, Math.floor(c * 0.4)), c, rnd);
  const b = rint(1, a - 1, rnd);
  return finalize({ kind: 'stockLeft', vars: { a, b, item: pick(STOCK_WORDS, rnd) }, op: 'sub', answer: a - b, steps: subtractionSteps(a, b), hint: subHint(a, b) }, grade, rnd);
}

/** უცნობი შესაკრები: „15 ბურგერი უნდა გააკეთო, 9 მზადაა — კიდევ რამდენი?" */
export function missingProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const c = real(grade, level, 300);
  const total = rint(Math.max(3, Math.floor(c * 0.4)), c, rnd);
  const done = rint(1, total - 1, rnd);
  return finalize({ kind: 'missing', vars: { total, done }, op: 'sub', answer: total - done, steps: subtractionSteps(total, done), hint: subHint(total, done) }, grade, rnd);
}

/** შედარება: „ორშაბათს 14 ბურგერი გაიყიდა, სამშაბათს 9 — რამდენით მეტი?" */
export function compareProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const c = real(grade, level, 500);
  const a = rint(Math.max(3, Math.floor(c * 0.5)), c, rnd);
  const b = rint(1, a - 1, rnd);
  return finalize({ kind: 'compare', vars: { a, b }, op: 'sub', answer: a - b, steps: subtractionSteps(a, b), hint: subHint(a, b) }, grade, rnd);
}

/** მიმდევრობის ბიჯები კლასის მიხედვით. */
const PATTERN_STEPS: Record<Grade, number[]> = { 1: [1, 2, 3], 2: [2, 5, 10], 3: [3, 4, 5, 6, 25, 50], 4: [7, 8, 9, 25, 125, 250] };

/** „ყოველ საათში მეტი შემოდის: 2, 4, 6, 8 … რამდენი შემდეგ?" (2+ კლასში — კლებადიც). */
export function patternProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const c = cap(grade, level);
  const d = pick(PATTERN_STEPS[grade].filter((x) => x * 5 <= c), rnd) ?? 1;
  const down = grade >= 2 && rnd() < 0.4;
  const span = 4 * d; // ოთხი ნაბიჯი პირველი წევრიდან პასუხამდე
  // საწყისი — ბიჯის ათმაგამდე (5405, 5413, … კი არა, 40, 48, 56, …)
  const top = Math.min(c, span + 10 * d);
  const start = down ? rint(span + 1, Math.max(span + 1, top), rnd) : rint(d <= 3 ? 1 : 0, Math.max(1, Math.min(c - span, 10 * d)), rnd);
  const seq = [0, 1, 2, 3].map((i) => start + (down ? -i : i) * d);
  const last = seq[3];
  const answer = down ? last - d : last + d;
  return finalize({
    kind: down ? 'patternDown' : 'pattern', vars: { seq: seq.join(', ') }, op: down ? 'sub' : 'add', answer,
    // ჯერ ბიჯი (რამდენით იცვლება), მერე — შემდეგი წევრი
    steps: [{ expr: down ? `${seq[0]} − ${seq[1]}` : `${seq[1]} − ${seq[0]}`, value: d }, { expr: `${last} ${down ? '−' : '+'} ${d}`, value: answer }],
    hint: { type: 'line', from: Math.min(last, answer), to: Math.max(last, answer) },
  }, grade, rnd);
}

/** „ორმაგ ბურგერში 2 კოტლეტია — 7 ორმაგს რამდენი სჭირდება?" (1 კლასში — შეკრებით). */
export function doublePattyProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem {
  const n = rint(2, Math.max(3, Math.min(Math.floor(cap(grade, level) / 2), grade === 1 ? 9 : grade === 2 ? 40 : 150)), rnd);
  const asAdd = !allows(grade, 'mul');
  return finalize({
    kind: 'doublePatty', vars: { n }, op: asAdd ? 'add' : 'mul', answer: 2 * n,
    steps: asAdd ? additionSteps([n, n]) : multiplicationSteps(2, n), hint: asAdd ? addHint([n, n]) : { type: 'groups', groups: 2, size: n, icon: 'grill_patty_ready' },
  }, grade, rnd);
}

/** „კაფეში 5 მაგიდაა, თითოეულთან 4 სკამი — სულ რამდენი?" (2+ კლასი). */
export function chairsProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem | null {
  const conf = DIFFICULTY[grade];
  if (!allows(grade, 'mul') || !conf.factors.length) return null;
  const n = pick(conf.factors, rnd);
  const kMax = grade === 4 ? 12 + level * 3 : grade === 3 ? 9 + level : 10;
  const k = rint(2, Math.max(2, Math.min(kMax, Math.floor(conf.max / n))), rnd);
  return finalize({
    kind: 'chairs', vars: { n, k }, op: 'mul', answer: n * k,
    steps: multiplicationSteps(n, k), hint: { type: 'groups', groups: n, size: k, icon: 'icon_people' },
  }, grade, rnd);
}

/** ორნაბიჯიანი: „კაფე 10:00–16:00 მუშაობს, ყოველ საათში 8 კლიენტი — სულ?" (3–4 კლასი, დღის საათებით). */
export function hoursMulProblem(grade: Grade, rnd: Rnd = Math.random, hours: [number, number] = dayHours(grade, rnd)): Problem | null {
  if (grade < 3) return null;
  const [open, close] = hours;
  const h = close - open;
  const factors = DIFFICULTY[grade].factors;
  if (!factors.includes(h)) return null; // საათების რაოდენობა კლასის ტაბულის ფარგლებში უნდა იყოს
  const k = pick(factors.filter((x) => x >= 3), rnd);
  return finalize({
    kind: 'hoursMul', vars: { open: `${open}:00`, close: `${close}:00`, k }, op: 'mul', answer: h * k,
    steps: [{ expr: `${close} − ${open}`, value: h }, ...multiplicationSteps(h, k)], hint: { type: 'groups', groups: h, size: k, icon: 'icon_people' },
  }, grade, rnd);
}

/** პერიმეტრი: „მაგიდის გვერდები 6 დმ და 4 დმ — ირგვლივ რამდენი ლენტი?" (3–4 კლასი). */
export function perimeterProblem(grade: Grade, level = ADAPTIVE.start, rnd: Rnd = Math.random): Problem | null {
  if (grade < 3) return null;
  const hi = grade === 4 ? 20 + level * 10 : 8 + level * 3;
  const a = rint(3, hi, rnd);
  const b = rint(2, a, rnd);
  return finalize({
    kind: 'perimeter', vars: { a, b }, op: 'add', answer: 2 * (a + b),
    steps: [{ expr: `${a} + ${b}`, value: a + b }, { expr: `${a + b} + ${a + b}`, value: 2 * (a + b) }],
    hint: { type: 'line', from: a + b, to: 2 * (a + b) },
  }, grade, rnd);
}

export interface PrepLevels { add?: number; sub: number; mul?: number; div: number }

/**
 * დილის მომზადების ამოცანა: ბევრი სახეობიდან (კლასის მიხედვით).
 * avoid — წინა დღის სახეობა, ზედიზედ ორჯერ რომ არ განმეორდეს.
 */
export function prepProblem(grade: Grade, levels: PrepLevels, rnd: Rnd = Math.random, hours?: [number, number], avoid?: string): Problem | null {
  const add = levels.add ?? ADAPTIVE.start, mul = levels.mul ?? ADAPTIVE.start;
  const options: (() => Problem | null)[] = [
    () => hoursProblem(grade, rnd, hours),
    () => customersProblem(grade, add, rnd),
    () => stockLeftProblem(grade, levels.sub, rnd),
    () => missingProblem(grade, levels.sub, rnd),
    () => compareProblem(grade, levels.sub, rnd),
    () => patternProblem(grade, add, rnd),
    () => doublePattyProblem(grade, mul, rnd),
  ];
  if (allows(grade, 'div')) options.push(() => groupProblem(grade, levels.div, rnd));
  if (allows(grade, 'mul')) options.push(() => chairsProblem(grade, mul, rnd));
  if (grade >= 3) {
    options.push(() => cookTimeProblem(grade, rnd), () => fractionProblem(grade, levels.div, rnd), () => perimeterProblem(grade, add, rnd));
    if (hours) options.push(() => hoursMulProblem(grade, rnd, hours));
  }
  for (let tries = 0; tries < 8; tries++) {
    const pr = pick(options, rnd)();
    if (pr && pr.kind !== avoid) return pr;
  }
  return hoursProblem(grade, rnd, hours);
}

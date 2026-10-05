import { describe, expect, it } from 'vitest';
import type { Grade } from '../../core/types';
import { ADAPTIVE, DIFFICULTY } from '../../config/difficulty';
import { ITEMS, PRODUCTS } from '../../config/economy';
import { itemPrice } from '../economy';
import {
  budgetProblem, changeProblem, cookTimeProblem, fractionProblem, groupProblem, hoursProblem, linePay, makeChoices, newAdaptive, packsProblem, prepProblem,
  purchaseProblem, shareProblem, sideQtyMax, sumProblem, updateAdaptive, type Line,
} from './generator';
import { additionSteps, divisionSteps, multiplicationSteps, subtractionSteps } from './steps';
import type { Problem } from './types';

const GRADES: Grade[] = [1, 2, 3, 4];
const LEVELS = [0, 1, 2, 3, 4];
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** საერთო შემოწმება ყველა ამოცანისთვის. */
function checkCommon(p: Problem, g: Grade) {
  const conf = DIFFICULTY[g];
  expect(Number.isInteger(p.answer), `${p.kind} answer integer`).toBe(true);
  expect(p.answer, `${p.kind} answer ≥ 0`).toBeGreaterThanOrEqual(0);
  expect(p.answer, `${p.kind} answer ≤ max`).toBeLessThanOrEqual(conf.max);
  expect(conf.ops, `${p.kind}: op ${p.op} allowed in grade ${g}`).toContain(p.op);
  for (const v of Object.values(p.vars)) if (typeof v === 'number') {
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
  }
  expect(p.steps.length).toBeGreaterThan(0);
  if (p.input === 'choice') {
    expect(p.choices).toHaveLength(3);
    expect(new Set(p.choices).size).toBe(3);
    expect(p.choices).toContain(p.answer);
    for (const c of p.choices!) expect(c).toBeGreaterThanOrEqual(0);
  }
  if (g === 1 && p.input !== 'change') expect(p.input).toBe('choice');
}

const menuLines = (g: Grade, rnd: () => number, qtyMax: number): Line[] => {
  const burgers = (['burger', 'cheeseburger', 'double'] as const).map((id) => ({ name: id, qty: 1, price: PRODUCTS[id].prices[g][0], icon: '' }));
  const sides = (['juice', 'fries', 'icecream'] as const).map((id) => ({ name: id, qty: 1, price: PRODUCTS[id].prices[g][0], icon: '' }));
  const lines: Line[] = [{ ...burgers[Math.floor(rnd() * 3)] }];
  if (rnd() < 0.7) lines.push({ ...sides[Math.floor(rnd() * 3)], qty: 1 + Math.floor(rnd() * qtyMax) });
  return lines;
};

describe('სირთულის კონფიგურაცია', () => {
  it('1 კლასში გამრავლება/გაყოფა არ არის, პასუხი არჩევით', () => {
    expect(DIFFICULTY[1].ops).toEqual(['add', 'sub']);
    expect(DIFFICULTY[1].answer).toBe('choice');
    expect(DIFFICULTY[1].max).toBe(20);
  });
  it('1 კლასის მენიუს ფასები 1–5 ₾-ია', () => {
    for (const p of Object.values(PRODUCTS)) {
      expect(p.prices[1][0]).toBeGreaterThanOrEqual(1);
      expect(p.prices[1][0]).toBeLessThanOrEqual(5);
    }
  });
  it('2 კლასი: გამრავლება მხოლოდ ×2, ×5, ×10', () => {
    expect(DIFFICULTY[2].factors).toEqual([2, 5, 10]);
    expect(DIFFICULTY[2].qtyMax).toBeLessThanOrEqual(2);
  });
  it('ნაშთიანი გაყოფა და აქციები მხოლოდ 4 კლასში', () => {
    for (const g of GRADES) {
      expect(DIFFICULTY[g].remainder).toBe(g === 4);
      expect(DIFFICULTY[g].discount).toBe(g === 4);
    }
  });
});

describe('სალარო: ჯამი (შეკრება და გამრავლება)', () => {
  it('ფარგლებში, მთელი, დაშვებული მოქმედებით — ყველა კლასსა და დონეზე', () => {
    const rnd = seeded(1);
    for (const g of GRADES) for (const lvl of LEVELS) for (let k = 0; k < 150; k++) {
      const lines = menuLines(g, rnd, sideQtyMax(g, lvl));
      for (const l of lines) if (l.qty > 1) expect(DIFFICULTY[g].factors).toContain(l.qty);
      const promoLine = DIFFICULTY[g].discount ? lines.findIndex((l) => l.qty === 3) : -1;
      const p = sumProblem(lines, g, rnd, promoLine);
      checkCommon(p, g);
      const expected = lines.reduce((a, l, i) => a + linePay(l, i === promoLine), 0);
      expect(p.answer).toBe(expected);
      expect(p.steps.at(-1)!.value).toBe(p.answer);
      if (g === 1) expect(p.op).toBe('add');
    }
  });
  it('აქცია: 3 ცალი 2-ის ფასად', () => {
    const l: Line = { name: 'juice', qty: 3, price: 4, icon: '' };
    expect(linePay(l, true)).toBe(8);
    expect(linePay(l, false)).toBe(12);
    const p = sumProblem([{ name: 'burger', qty: 1, price: 12, icon: '' }, l], 4, seeded(2), 1);
    expect(p.kind).toBe('sumPromo');
    expect(p.answer).toBe(20);
  });
});

describe('სალარო: ხურდა და ანგარიშის გაყოფა', () => {
  it('ხურდა დადებითია, კუპიურა კლასის ფარგლებში, მონეტები ≤ პასუხი', () => {
    const rnd = seeded(3);
    for (const g of GRADES) for (const lvl of LEVELS) for (let total = 1; total <= Math.min(300, DIFFICULTY[g].max); total++) {
      const p = changeProblem(total, g, lvl, rnd);
      if (!p) continue;
      checkCommon(p, g);
      expect(p.input).toBe('change');
      expect(p.answer).toBeGreaterThan(0);
      expect(p.vars.a).toBeLessThanOrEqual(DIFFICULTY[g].max);
      expect(Number(p.vars.a) - Number(p.vars.b)).toBe(p.answer);
      for (const d of p.denoms!) expect(d).toBeLessThanOrEqual(Math.max(1, p.answer));
      expect(p.steps.at(-1)!.value).toBe(p.answer);
    }
  });
  it('თანაბრად გაყოფა — მხოლოდ ნაშთის გარეშე, 1 კლასში არასდროს', () => {
    const rnd = seeded(4);
    for (let total = 1; total <= 20; total++) expect(shareProblem(total, 1, rnd)).toBeNull();
    for (const g of [2, 3, 4] as Grade[]) for (let total = 1; total <= 200; total++) {
      const p = shareProblem(total, g, rnd);
      if (!p) continue;
      checkCommon(p, g);
      const n = Number(p.vars.n);
      expect(DIFFICULTY[g].divisors).toContain(n);
      expect(total % n).toBe(0);
      expect(p.answer * n).toBe(total);
    }
  });
});

describe('სამზარეულო და საწყობი', () => {
  it('კოტლეტები თეფშებზე: მთელი გაყოფა; ნაშთი მხოლოდ 4 კლასში და ნაკლებია გამყოფზე', () => {
    const rnd = seeded(5);
    expect(groupProblem(1, 2, rnd)).toBeNull();
    for (const g of [2, 3, 4] as Grade[]) for (const lvl of LEVELS) for (let k = 0; k < 200; k++) {
      const p = groupProblem(g, lvl, rnd)!;
      checkCommon(p, g);
      const total = Number(p.vars.total), n = Number(p.vars.n);
      expect(total).toBeLessThanOrEqual(DIFFICULTY[g].max);
      if (p.kind === 'group') expect(p.answer * n).toBe(total);
      else {
        expect(g).toBe(4);
        expect(p.answer).toBeGreaterThan(0);
        expect(p.answer).toBeLessThan(n);
        expect(total % n).toBe(p.answer);
      }
      expect(p.steps.at(-1)!.value).toBe(p.answer);
    }
  });
  it('შეკვრები და ბიუჯეტი', () => {
    const rnd = seeded(6);
    const pk = packsProblem(4, 3, 'ფუნთუშა', 3, rnd);
    expect(pk.answer).toBe(12);
    expect(pk.op).toBe('mul');
    expect(packsProblem(3, 2, 'ყველი', 1, rnd).op).toBe('add');
    const b = budgetProblem(50, 32, 2, rnd);
    expect(b.answer).toBe(18);
    expect(b.steps.at(-1)!.value).toBe(18);
  });
});

describe('მაღაზია: ყიდვა', () => {
  it('ყველა ნივთზე და ბალანსზე: არაუარყოფითი და ფარგლებში', () => {
    const rnd = seeded(7);
    for (const g of GRADES) for (const it of ITEMS) {
      const price = itemPrice(it, g);
      if (!price) continue;
      for (let k = 0; k < 30; k++) {
        const balance = price + Math.floor(rnd() * price * 3);
        const p = purchaseProblem(balance, price, 'x', g, rnd);
        checkCommon(p, g);
        if (p.kind !== 'bills') expect(Number(p.vars.a)).toBeLessThanOrEqual(DIFFICULTY[g].max);
        else expect(Number(p.vars.a) % Number(p.vars.b)).toBe(0);
      }
    }
  });
});

describe('ნაბიჯ-ნაბიჯ ამოხსნები', () => {
  it('სწორ პასუხამდე მიდის', () => {
    expect(subtractionSteps(145, 90).at(-1)!.value).toBe(55);
    expect(subtractionSteps(15, 7).map((s) => s.value)).toEqual([10, 8]);
    expect(additionSteps([27, 15]).at(-1)!.value).toBe(42);
    expect(multiplicationSteps(3, 4).at(-1)!.value).toBe(12);
    expect(multiplicationSteps(6, 23).at(-1)!.value).toBe(138);
    expect(divisionSteps(18, 3).at(-1)!.value).toBe(6);
    expect(divisionSteps(14, 4).at(-1)!.value).toBe(2);
  });
});

describe('ადაპტური სირთულე', () => {
  it('5 ზედიზედ სწორი → დონე იზრდება, მაგრამ არა მაქსიმუმზე მეტად', () => {
    let s = newAdaptive();
    for (let i = 0; i < 5; i++) s = updateAdaptive(s, true);
    expect(s.level).toBe(ADAPTIVE.start + 1);
    for (let i = 0; i < 100; i++) s = updateAdaptive(s, true);
    expect(s.level).toBe(ADAPTIVE.levels - 1);
  });
  it('ხშირი შეცდომა → დონე მცირდება, მაგრამ არა 0-ზე ნაკლებად', () => {
    let s = newAdaptive();
    s = updateAdaptive(s, false);
    s = updateAdaptive(s, true);
    s = updateAdaptive(s, false);
    expect(s.level).toBe(ADAPTIVE.start - 1);
    for (let i = 0; i < 50; i++) s = updateAdaptive(s, false);
    expect(s.level).toBe(0);
  });
  it('ერთი შემთხვევითი შეცდომა დონეს არ ამცირებს', () => {
    let s = newAdaptive();
    s = updateAdaptive(s, false);
    expect(s.level).toBe(ADAPTIVE.start);
  });
});

describe('ვარიანტები (1 კლასი)', () => {
  it('3 განსხვავებული, არაუარყოფითი, სწორის ჩათვლით', () => {
    const rnd = seeded(8);
    for (let ans = 0; ans <= 20; ans++) {
      const c = makeChoices(ans, rnd);
      expect(c).toHaveLength(3);
      expect(new Set(c).size).toBe(3);
      expect(c).toContain(ans);
      for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('დრო და წილადები (დილის მომზადება)', () => {
  const rnds = Array.from({ length: 60 }, (_, i) => { let s = i + 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; });
  it('საათები: პასუხი = დახურვა − გახსნა; 1 კლასში ≤ 20 და არჩევით', () => {
    for (const r of rnds) for (const g of [1, 2, 3, 4] as const) {
      const p = hoursProblem(g, r);
      const open = parseInt(String(p.vars.open)), close = parseInt(String(p.vars.close));
      expect(p.answer).toBe(close - open);
      expect(p.answer).toBeGreaterThan(0);
      if (g === 1) { expect(close).toBeLessThanOrEqual(20); expect(p.input).toBe('choice'); }
      expect(p.steps.at(-1)!.value).toBe(p.answer);
    }
  });
  it('კოტლეტის წუთები: საათის გადაკვეთით სწორად ითვლის; 1–2 კლასში არ არის', () => {
    expect(cookTimeProblem(2, rnds[0])).toBeNull();
    for (const r of rnds) for (const g of [3, 4] as const) {
      const p = cookTimeProblem(g, r)!;
      const [h0, m0] = String(p.vars.start).split(':').map(Number), [h1, m1] = String(p.vars.end).split(':').map(Number);
      expect(p.answer).toBe(h1 * 60 + m1 - (h0 * 60 + m0));
      expect(p.steps.at(-1)!.value).toBe(p.answer);
    }
  });
  it('წილადები: მთელი რიცხვი, ნაბიჯები სწორი; 4 კლასში ¾ და ⅔-იც', () => {
    expect(fractionProblem(2, 2, rnds[0])).toBeNull();
    const seen = new Set<string>();
    for (const r of rnds) for (const g of [3, 4] as const) {
      const p = fractionProblem(g, 2, r)!;
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.steps.at(-1)!.value).toBe(p.answer);
      expect(p.answer).toBeLessThan(Number(p.vars.total));
      if (g === 3) expect(['ნახევარი (½)', 'მესამედი (⅓)', 'მეოთხედი (¼)']).toContain(p.vars.frac);
      seen.add(String(p.vars.frac));
    }
    expect(seen.has('სამი მეოთხედი (¾)')).toBe(true);
  });
  it('დილის ამოცანა: ყველა კლასს აქვს; სახეობები კლასის მიხედვით', () => {
    const kinds = (g: 1 | 2 | 3 | 4) => new Set(rnds.map((r) => prepProblem(g, { sub: 2, div: 2 }, r)?.kind));
    expect([...kinds(1)]).toEqual(['hours']);
    expect(kinds(2).has('cookTime')).toBe(false);
    expect(kinds(3)).toEqual(new Set(['hours', 'group', 'cookTime', 'fraction']));
  });
});

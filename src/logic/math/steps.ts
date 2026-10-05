// ნაბიჯ-ნაბიჯ ამოხსნები (ნაჩვენებია მეორე შეცდომის შემდეგ).
import type { Step } from './types';

/** a − b: პატარა რიცხვებში „ათამდე შევსება", დიდებში — თანრიგებით. */
export function subtractionSteps(a: number, b: number): Step[] {
  let parts: number[];
  if (a > 10 && a <= 20 && b < 10 && a % 10 < b && a % 10 > 0) {
    parts = [a % 10, b - (a % 10)];
  } else {
    parts = placeParts(b);
  }
  const steps: Step[] = [];
  let cur = a;
  for (const part of parts) {
    steps.push({ expr: `${cur} − ${part}`, value: cur - part });
    cur -= part;
  }
  return steps;
}

/** a + b + …: ყოველ შესაკრებს ვუმატებთ ჯერ ათეულებს, მერე ერთეულებს. */
export function additionSteps(terms: number[]): Step[] {
  const steps: Step[] = [];
  let cur = terms[0];
  for (const t of terms.slice(1)) {
    const parts = cur >= 10 && t > 10 && t % 10 ? placeParts(t) : [t];
    for (const part of parts) {
      steps.push({ expr: `${cur} + ${part}`, value: cur + part });
      cur += part;
    }
  }
  if (!steps.length) steps.push({ expr: String(cur), value: cur });
  return steps;
}

/** n × a: პატარაზე — განმეორებითი შეკრება, დიდზე — თანრიგებად დაშლა. */
export function multiplicationSteps(n: number, a: number): Step[] {
  if (n <= 4 && a <= 20) {
    const steps: Step[] = [];
    for (let k = 2; k <= n; k++) steps.push({ expr: Array(k).fill(a).join(' + '), value: a * k });
    return steps.length ? steps : [{ expr: `1 × ${a}`, value: a }];
  }
  const parts = placeParts(a);
  if (parts.length === 1) return [{ expr: `${n} × ${a}`, value: n * a }];
  const steps = parts.map((p) => ({ expr: `${n} × ${p}`, value: n * p }));
  steps.push({ expr: steps.map((s) => s.value).join(' + '), value: n * a });
  return steps;
}

/** total ÷ n: შემოწმება გამრავლებით; ნაშთიანში — დარჩენილის გამოთვლა. */
export function divisionSteps(total: number, n: number): Step[] {
  const q = Math.floor(total / n), r = total - q * n;
  const steps: Step[] = [{ expr: `${n} × ${q}`, value: n * q }];
  if (r) steps.push({ expr: `${total} − ${n * q}`, value: r });
  else steps.push({ expr: `${total} ÷ ${n}`, value: q });
  return steps;
}

/** 345 → [300, 40, 5] */
export function placeParts(v: number): number[] {
  const parts: number[] = [];
  let rest = v;
  for (let place = 10 ** Math.max(0, String(v).length - 1); place >= 1; place /= 10) {
    const part = Math.floor(rest / place) * place;
    if (part > 0) parts.push(part);
    rest -= part;
  }
  return parts.length ? parts : [0];
}

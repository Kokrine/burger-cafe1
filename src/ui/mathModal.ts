// მათემატიკის ფანჯარა. წესები:
//  * შეცდომაზე ფული არ იკლებს და არავინ ბრაზდება — ჩნდება ვიზუალური მინიშნება;
//  * მეორე შეცდომის შემდეგ — ამოხსნა ნაბიჯ-ნაბიჯ;
//  * ქულები: 1 ცდა > 2 ცდა > ამოხსნის შემდეგ (არასდროს ნული).
// შეყვანა: 3 ვარიანტი (1 კლ.), ციფრული კლავიატურა, ან ხურდის აწყობა მონეტებით.
import { S, t } from '../i18n/strings.ka';
import { store } from '../core/store';
import type { Grade } from '../core/types';
import type { Hint, Problem } from '../logic/math/types';
import { purchaseProblem } from '../logic/math/generator';
import { recordAnswer, type Attempt } from '../logic/scoring';
import { bump } from '../logic/badges';
import { play } from '../audio/sfx';
import { button, h, img } from './dom';
import { burstAt, openModal } from './layers';

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
export const problemText = (p: Problem) => t(S.problems[p.kind], p.vars);

export interface AskOptions {
  /** ✕ ღილაკი (სალაროში არ არის — კლიენტი ელოდება). */
  cancellable?: boolean;
  /** მინიშნება თავიდანვე ჩანს (სალარო-აპარატი). */
  hintFirst?: boolean;
}

/** ყიდვის ამოცანა. აბრუნებს true-ს, თუ ბავშვმა ამოცანა დაასრულა. */
export function askPurchase(itemName: string, balance: number, price: number, grade: Grade): Promise<boolean> {
  return askProblem(t(S.math.buyTitle, { item: itemName }), purchaseProblem(balance, price, itemName, grade));
}

export function askProblem(title: string, pr: Problem, opts: AskOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    let wrong = 0;
    let value = '';
    let finished = false;
    let close = () => {};

    const answerBox = h('div', { class: 'answer', 'aria-live': 'polite' }, '?');
    const feedback = h('p', { class: 'feedback' });
    const extra = h('div', { style: 'width:100%' });
    const inputArea = h('div', { style: 'width:100%;display:flex;justify-content:center' });
    const body = h('div', { class: 'panel-body' }, h('p', { class: 'question' }, problemText(pr)), feedback, extra, inputArea);

    const finish = (attempt: Attempt) => {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKey);
      let award = { points: 0, stars: 0, streakBonus: false, levelUp: false };
      store.update((p) => {
        award = recordAnswer(p, pr.op, attempt);
        if (p.today && p.today.day === p.day) {
          const td = p.today;
          if (attempt === 1) {
            td.mathFirst = (td.mathFirst ?? 0) + 1;
            if (pr.kind === 'change') td.changeFirst = (td.changeFirst ?? 0) + 1;
          }
          td.bestStreak = Math.max(td.bestStreak ?? 0, p.streak);
        }
        if (attempt !== 3) {
          bump(p, `ok_${pr.op}`);
          if (pr.kind === 'change') bump(p, 'change_ok');
        }
      });
      play(attempt === 3 ? 'coin' : 'correct');
      const streak = store.get().streak;
      inputArea.replaceChildren(h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:12px' },
        h('div', { class: 'award bounce-in' },
          h('span', null, t(S.math.points, { n: award.points })),
          award.stars ? h('span', { style: 'display:flex;align-items:center;gap:4px' }, img('star'), t(S.math.stars, { n: award.stars })) : '',
        ),
        award.streakBonus ? h('p', { class: 'feedback good' }, t(S.math.streak, { n: streak })) : '',
        award.levelUp ? h('p', { class: 'feedback good' }, S.math.levelUp) : '',
        button(S.common.continue, () => { close(); resolve(true); }, 'green big'),
      ));
      if (attempt !== 3) {
        feedback.className = 'feedback good';
        feedback.textContent = pick(S.math.correct);
        extra.replaceChildren();
      }
      burstAt(inputArea);
    };

    const submit = (v: number) => {
      if (finished) return;
      if (v === pr.answer) {
        answerBox.textContent = String(v);
        finish(wrong === 0 ? 1 : 2);
        return;
      }
      wrong += 1;
      play('wrong');
      body.classList.remove('shake');
      void body.offsetWidth;
      body.classList.add('shake');
      feedback.className = 'feedback try';
      if (wrong === 1) {
        feedback.textContent = S.math.wrong1;
        extra.replaceChildren(renderHint(pr.hint));
        value = '';
        answerBox.textContent = '?';
        renderInput();
      } else {
        feedback.textContent = S.math.wrong2;
        extra.replaceChildren(h('div', { class: 'hint-box' },
          h('ol', { class: 'steps' }, ...pr.steps.map((s) => h('li', null, `${s.expr} = ${s.value}`))),
          h('b', { style: 'font-size:24px' }, t(S.math.answerIs, { n: pr.answer })),
        ));
        inputArea.replaceChildren(button(S.common.ok, () => finish(3), 'teal big'));
      }
    };

    const renderInput = () => {
      if (pr.input === 'choice' && pr.choices) {
        inputArea.replaceChildren(h('div', { class: 'choice' }, ...pr.choices.map((c) => button(String(c), () => submit(c), 'white'))));
      } else if (pr.input === 'change') {
        inputArea.replaceChildren(changePicker(pr.denoms ?? [1, 2, 5, 10], submit));
      } else {
        const set = (v: string) => {
          value = v.slice(0, 5);
          answerBox.textContent = value || '?';
        };
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
        inputArea.replaceChildren(h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:14px' },
          answerBox,
          h('div', { class: 'keypad' }, ...keys.map((k) => button(k, () => {
            if (k === '⌫') set(value.slice(0, -1));
            else if (k === '✓') { if (value) submit(Number(value)); }
            else set(value + k);
          }, k === '✓' ? 'green' : k === '⌫' ? 'teal' : 'white'))),
        ));
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (finished || pr.input !== 'keypad') return;
      if (/^[0-9]$/.test(e.key)) { value = (value + e.key).slice(0, 5); answerBox.textContent = value; }
      else if (e.key === 'Backspace') { value = value.slice(0, -1); answerBox.textContent = value || '?'; }
      else if (e.key === 'Enter' && value) submit(Number(value));
    };
    document.addEventListener('keydown', onKey);

    renderInput();
    if (opts.hintFirst) extra.replaceChildren(renderHint(pr.hint));
    const panel = h('div', { class: 'panel modal bounce-in' },
      h('div', { class: 'panel-head' }, img('coin'), h('h2', null, title)),
      opts.cancellable === false ? '' : h('button', {
        class: 'btn white round modal-close', 'aria-label': S.math.cancel, title: S.math.cancel,
        onClick: () => {
          if (finished) return;
          document.removeEventListener('keydown', onKey);
          close();
          resolve(false);
        },
      }, '✕'),
      body,
    );
    close = openModal(panel);
  });
}

// ---------------- ხურდის აწყობა მონეტებით ----------------

const money = (d: number) =>
  h('span', { class: `money ${d >= 5 ? 'bill' : 'coin'}` }, img(d >= 5 ? 'bill' : 'coin'), h('b', null, `${d}`));

function changePicker(denoms: number[], submit: (v: number) => void): HTMLElement {
  const picked: number[] = [];
  const pile = h('div', { class: 'pile' });
  const draw = () => {
    pile.replaceChildren(...(picked.length
      ? [...picked].sort((a, b) => b - a).map((d) => h('button', {
        class: 'money-btn small', title: S.math.picker.remove,
        onClick: () => { picked.splice(picked.indexOf(d), 1); draw(); },
      }, money(d)))
      : [h('span', { class: 'hint' }, S.math.picker.empty)]));
  };
  draw();
  return h('div', { class: 'picker' },
    h('p', { class: 'hint', style: 'margin:0' }, S.math.picker.pick),
    h('div', { class: 'tray' }, ...denoms.map((d) => h('button', {
      class: 'money-btn', onClick: () => { if (picked.length < 30) { picked.push(d); draw(); play('coin'); } },
    }, money(d)))),
    h('p', { class: 'hint', style: 'margin:6px 0 0' }, S.math.picker.yours),
    pile,
    h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center' },
      button(S.math.picker.clear, () => { picked.length = 0; draw(); }, 'white'),
      button(S.math.picker.give, () => { if (picked.length) submit(picked.reduce((a, b) => a + b, 0)); }, 'green big', 'coin'),
    ),
  );
}

// ---------------- მინიშნებები ----------------

export function renderHint(hint: Hint): HTMLElement {
  const H = S.math.hint;
  switch (hint.type) {
    case 'coins': {
      const total = hint.groups.reduce((a, b) => a + b, 0);
      const crossedFrom = total - (hint.crossed ?? 0);
      let i = 0;
      return h('div', { class: 'hint-box' },
        h('div', { class: 'coins', style: 'gap:18px' }, ...hint.groups.map((n) => h('div', { class: 'coins' },
          ...Array.from({ length: n }, () => h('span', { class: `c ${i++ >= crossedFrom ? 'out' : ''}` }, img('coin')))))),
        hint.crossed ? H.coinsSub : H.coinsAdd,
      );
    }
    case 'line':
      return h('div', { class: 'hint-box' }, numberLine(hint.from, hint.to), t(H.line, { from: hint.from, to: hint.to }));
    case 'place': {
      const widest = Math.max(hint.top, hint.bottom, hint.sign === '+' ? hint.top + hint.bottom : 0);
      return h('div', { class: 'hint-box' }, placeValue(widest, hint.top, hint.bottom, hint.sign), H.place);
    }
    case 'groups': {
      const unit = () => (hint.size <= 10
        ? h('div', { class: 'coins' }, ...Array.from({ length: hint.size }, () => h('span', { class: 'c' }, img(hint.icon))))
        : h('div', { class: 'coins' }, money(hint.size)));
      return h('div', { class: 'hint-box' },
        h('div', { class: 'groups' }, ...Array.from({ length: hint.groups }, () => h('div', { class: 'group' }, unit()))),
        t(H.groups, { groups: hint.groups, size: hint.size }),
      );
    }
    case 'share': {
      const small = hint.total <= 40;
      // პირველი რიგი უკვე დარიგებულია, დანარჩენი გროვაშია — ბავშვი აგრძელებს
      return h('div', { class: 'hint-box' },
        h('div', { class: 'groups' }, ...Array.from({ length: hint.parts }, () => h('div', { class: 'group plate' },
          small ? h('span', { class: 'c' }, img(hint.icon)) : h('b', { style: 'font-size:26px' }, '?')))),
        small ? h('div', { class: 'coins' }, ...Array.from({ length: Math.max(0, hint.total - hint.parts) }, () => h('span', { class: 'c' }, img(hint.icon)))) : '',
        t(H.share, { total: hint.total, parts: hint.parts }),
      );
    }
    case 'bills':
      return h('div', { class: 'hint-box' },
        h('div', { class: 'coins' }, ...Array.from({ length: Math.min(hint.count, 3) }, () => money(hint.denom))),
        t(H.bills, { a: hint.denom * hint.count, b: hint.denom, b2: hint.denom * 2, b3: hint.denom * 3 }),
      );
  }
}

/** რიცხვითი წრფე from-დან to-მდე ნახტომებით (ჯერ უახლოეს ათეულამდე, მერე ათეულებით). */
function numberLine(from: number, to: number): SVGSVGElement {
  const stops = [from];
  let cur = from;
  if (cur % 10 && Math.ceil(cur / 10) * 10 <= to) { cur = Math.ceil(cur / 10) * 10; stops.push(cur); }
  while (cur + 10 <= to) { cur += 10; stops.push(cur); }
  if (cur < to) stops.push(to);
  const W = 560, pad = 30;
  const x = (v: number) => pad + ((v - from) / Math.max(1, to - from)) * (W - pad * 2);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} 110`);
  svg.setAttribute('width', '100%');
  svg.style.maxWidth = `${W}px`;
  let inner = `<line x1="${pad - 10}" y1="80" x2="${W - pad + 10}" y2="80" stroke="#2B1810" stroke-width="4" stroke-linecap="round"/>`;
  stops.forEach((v, i) => {
    inner += `<line x1="${x(v)}" y1="70" x2="${x(v)}" y2="90" stroke="#2B1810" stroke-width="3"/>`;
    inner += `<text x="${x(v)}" y="108" text-anchor="middle" font-size="17" font-weight="800" fill="#2B1810">${v}</text>`;
    if (i > 0) {
      const p = stops[i - 1], mid = (x(p) + x(v)) / 2;
      inner += `<path d="M ${x(p)} 68 Q ${mid} 20 ${x(v)} 68" fill="none" stroke="#FF8A3D" stroke-width="3.5"/>`;
      inner += `<text x="${mid}" y="38" text-anchor="middle" font-size="17" font-weight="900" fill="#D9631B">+${v - p}</text>`;
    }
  });
  svg.innerHTML = inner;
  return svg;
}

/** თანრიგების სვეტები: a ზემოთ, b ქვემოთ (sign: + ან −). */
function placeValue(widest: number, a: number, b: number, sign: string): HTMLElement {
  const len = String(widest).length;
  const labels = S.math.places.slice(-len);
  const pad = (v: number) => String(v).padStart(len, ' ').split('');
  return h('div', { class: 'place', style: `--cols:${len + 1}` },
    h('span', { class: 'lbl' }), ...labels.map((l) => h('span', { class: 'lbl' }, l)),
    h('span', { style: 'border:0' }), ...pad(a).map((d) => h('span', null, d.trim())),
    h('span', { style: 'border:0' }, sign), ...pad(b).map((d) => h('span', null, d.trim())),
  );
}

// „ჩემი ანგარიში": კაფეს სახელი, ბეჯების თარო, სიზუსტის ზოლები ოპერაციების მიხედვით
// (+ ვარჯიში), მოგების დიაგრამა და დღეების ისტორია.
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import type { Op, Progress } from '../../core/types';
import { BADGES, badgeAvailable, badgeProgress } from '../../logic/badges';
import { allows } from '../../logic/math/generator';
import { button, h, img } from '../dom';
import { go } from '../layers';
import { weakestOp } from '../../logic/practice';
import { runPractice } from '../practice';
import { askCafeName, cafeTitle } from '../cafeName';

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

export function profileScreen(): HTMLElement {
  const p = store.get();
  const P = S.profile;

  const shelf = h('div', { class: 'shelf' }, ...BADGES.map((b) => {
    const avail = badgeAvailable(b, p.grade);
    const pr = badgeProgress(b, p);
    const meta = S.badges.list[b.id];
    const n = b.target(p.grade);
    return h('div', { class: `badge ${pr.done ? 'earned' : ''} ${avail ? '' : 'na'}` },
      h('div', { class: 'medal' }, img(pr.done ? 'badge_gold' : 'badge_grey', 'frame'), img(b.icon, 'emblem')),
      h('b', null, t(meta.name, { n })),
      h('small', null, t(meta.desc, { n })),
      avail
        ? (pr.done ? '' : h('div', { class: 'bar-lg small' }, h('i', { style: `width:${(pr.value / pr.target) * 100}%` })))
        : h('small', { class: 'chip lock' }, S.badges.fromGrade2),
      avail && !pr.done ? h('small', null, `${pr.value} / ${pr.target}`) : '',
    );
  }));

  const math = h('div', { class: 'math-bars' }, ...OPS.filter((op) => allows(p.grade, op) || p.accuracy[op].attempts > 0).map((op) => {
    const a = p.accuracy[op];
    const pct = a.attempts ? Math.round((a.firstTry / a.attempts) * 100) : 0;
    return h('div', { class: 'math-row' },
      h('b', null, P.ops[op]),
      h('div', { class: 'bar-lg' }, h('i', { style: `width:${pct}%` })),
      h('span', null, a.attempts ? t(P.accuracy, { pct, ok: a.firstTry, n: a.attempts }) : P.noAttempts),
      allows(p.grade, op) ? button(S.practice.button, () => void practice(op), 'teal small') : '',
    );
  }));
  const weak = weakestOp(p);
  const weakBox = h('div', { class: 'practice-cta' },
    button(t(S.practice.weak, { op: P.ops[weak] }), () => void practice(weak), 'green big', 'icon_bolt'),
    h('small', { class: 'hint' }, firstTryPct(p, weak) < 0.8 ? S.practice.weakHint : S.practice.leastHint),
  );

  const hist = p.history.slice(-10).reverse();
  const history = hist.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'students' },
      h('thead', null, h('tr', null, ...Object.values(P.cols).map((c) => h('th', null, c)))),
      h('tbody', null, ...hist.map((d) => h('tr', null,
        h('td', null, String(d.day)), h('td', null, `${d.revenue} ₾`), h('td', null, `${d.expenses} ₾`),
        h('td', { class: d.profit >= 0 ? 'pos' : 'neg' }, `${d.profit} ₾`), h('td', null, String(d.customers)), h('td', null, String(d.stars)))))))
    : h('p', { class: 'hint' }, P.noHistory);

  const nameChip = h('button', { class: 'chip ok name-chip', title: S.cafeName.edit, 'aria-label': S.cafeName.edit, onClick: () => void rename() },
    img('icon_store'), cafeTitle(p), ' ✏️');

  return h('div', { class: 'overlay interactive' }, h('div', { class: 'panel' },
    h('div', { class: 'panel-head' }, img('star'), h('h2', null, P.title),
      h('button', { class: 'btn white round', 'aria-label': S.common.close, onClick: () => go('menu') }, '✕')),
    h('div', { class: 'panel-body' },
      h('div', { class: 'info-strip' },
        nameChip,
        h('span', { class: 'chip ok' }, img('star'), `${S.hud.stars}: ${p.stars}`),
        h('span', { class: 'chip ok' }, img('icon_sparkle'), `${S.hud.points}: ${p.points}`),
        h('span', { class: 'chip' }, img('icon_clock'), t(P.streakDays, { n: p.dayStreak })),
        h('span', { class: 'chip' }, img('icon_bolt'), t(P.bestStreak, { n: p.bestStreak })),
      ),
      h('h3', { class: 'road-title' }, img('badge_gold'), P.badges), shelf,
      h('h3', { class: 'road-title' }, img('icon_menu_book'), P.math), weakBox, math,
      p.history.length >= 2 ? h('h3', { class: 'road-title' }, img('icon_level_up'), P.chart) : '',
      p.history.length >= 2 ? profitChart(p) : '',
      h('h3', { class: 'road-title' }, img('icon_calendar'), P.history), history,
    ),
  ));
}

/** ვარჯიში და ეკრანის განახლება (სიზუსტე/ვარსკვლავები შეიცვალა). */
async function practice(op: Op) {
  await runPractice(op);
  go('profile');
}

async function rename() {
  if ((await askCafeName()) !== null) go('profile');
}

/** მოგების სვეტოვანი დიაგრამა ბოლო 10 დღისთვის (დიაგრამის კითხვაც მათემატიკაა). */
function profitChart(p: Progress): HTMLElement {
  const days = p.history.slice(-10);
  const W = 44, H = 150, top = 22, bottom = 26;
  const max = Math.max(1, ...days.map((d) => Math.abs(d.profit)));
  const hasLoss = days.some((d) => d.profit < 0);
  const zero = hasLoss ? top + (H - top - bottom) / 2 : H - bottom;
  const scale = (zero - top) / max;
  const bars = days.map((d, i) => {
    const x = i * W + 8, w = W - 16, hgt = Math.max(2, Math.abs(d.profit) * scale);
    const y = d.profit >= 0 ? zero - hgt : zero;
    const ty = d.profit >= 0 ? y - 5 : y + hgt + 14;
    return `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="5" class="${d.profit >= 0 ? 'pos' : 'neg'}"/>`
      + `<text x="${x + w / 2}" y="${ty}" class="v">${d.profit}</text>`
      + `<text x="${x + w / 2}" y="${H - 8}" class="d">${d.day}</text>`;
  }).join('');
  const box = h('div', { class: 'profit-chart' });
  const width = 10 * W; // ყოველთვის 10 დღის ადგილი — 2–3 დღეზე სვეტები უზარმაზარი არ ხდება
  box.innerHTML = `<svg viewBox="0 0 ${width} ${H}" role="img" aria-label="${S.profile.chart}">`
    + `<line x1="0" x2="${width}" y1="${zero}" y2="${zero}" class="axis"/>${bars}</svg>`;
  box.append(h('small', { class: 'hint' }, S.profile.chartHint));
  return box;
}

const firstTryPct = (p: Progress, op: Op) => (p.accuracy[op].attempts ? p.accuracy[op].firstTry / p.accuracy[op].attempts : 0);

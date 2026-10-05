// „ჩემი ანგარიში": ბეჯების თარო, სიზუსტის ზოლები ოპერაციების მიხედვით,
// დღეების ისტორია.
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import type { Op } from '../../core/types';
import { BADGES, badgeAvailable, badgeProgress } from '../../logic/badges';
import { allows } from '../../logic/math/generator';
import { h, img } from '../dom';
import { go } from '../layers';

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
    );
  }));

  const hist = p.history.slice(-10).reverse();
  const history = hist.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'students' },
      h('thead', null, h('tr', null, ...Object.values(P.cols).map((c) => h('th', null, c)))),
      h('tbody', null, ...hist.map((d) => h('tr', null,
        h('td', null, String(d.day)), h('td', null, `${d.revenue} ₾`), h('td', null, `${d.expenses} ₾`),
        h('td', { class: d.profit >= 0 ? 'pos' : 'neg' }, `${d.profit} ₾`), h('td', null, String(d.customers)), h('td', null, String(d.stars)))))))
    : h('p', { class: 'hint' }, P.noHistory);

  return h('div', { class: 'overlay interactive' }, h('div', { class: 'panel' },
    h('div', { class: 'panel-head' }, img('star'), h('h2', null, P.title),
      h('button', { class: 'btn white round', 'aria-label': S.common.close, onClick: () => go('menu') }, '✕')),
    h('div', { class: 'panel-body' },
      h('div', { class: 'info-strip' },
        h('span', { class: 'chip ok' }, img('star'), `${S.hud.stars}: ${p.stars}`),
        h('span', { class: 'chip ok' }, img('icon_sparkle'), `${S.hud.points}: ${p.points}`),
        h('span', { class: 'chip' }, img('icon_clock'), t(P.streakDays, { n: p.dayStreak })),
        h('span', { class: 'chip' }, img('icon_bolt'), t(P.bestStreak, { n: p.bestStreak })),
      ),
      h('h3', { class: 'road-title' }, img('badge_gold'), P.badges), shelf,
      h('h3', { class: 'road-title' }, img('icon_menu_book'), P.math), math,
      h('h3', { class: 'road-title' }, img('icon_calendar'), P.history), history,
    ),
  ));
}

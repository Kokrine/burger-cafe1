// მასწავლებლის პანელი → მოსწავლის ბარათი: სიზუსტე და სირთულე ოპერაციებით, სუსტი მხარე,
// ბოლო დღეები და ბეჯები. მონაცემები მხოლოდ სასწავლო და თამაშისაა.
import { S, t } from '../../i18n/strings.ka';
import type { StudentDetail } from '../../data/backend';
import type { Op } from '../../core/types';
import { allows } from '../../logic/math/generator';
import { BADGES } from '../../logic/badges';
import { weakestOp } from '../../logic/insight';
import { button, h, img } from '../dom';
import { openModal } from '../layers';

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];
const D = S.teacherPanel.detail;
const P = S.profile;

export function openStudentDetail(d: StudentDetail) {
  let close = () => {};
  const p = d.progress;
  let body: HTMLElement;
  if (!p) {
    body = h('div', { class: 'panel-body' }, h('p', { class: 'hint' }, D.notPlayed));
  } else {
    const chips = h('div', { class: 'info-strip' },
      h('span', { class: 'chip' }, img('icon_calendar'), t(D.day, { n: p.day })),
      h('span', { class: 'chip ok' }, img('star'), `${S.hud.stars}: ${p.stars}`),
      h('span', { class: 'chip ok' }, img('icon_sparkle'), `${S.hud.points}: ${p.points}`),
      h('span', { class: 'chip' }, img('icon_level_up'), t(D.level, { n: p.cafeLevel })),
      h('span', { class: 'chip' }, img('icon_clock'), t(D.streak, { n: p.dayStreak ?? 0 })),
      h('span', { class: 'chip' }, img('badge_gold'), t(D.badgesN, { n: p.badges.length })),
    );

    const ops = OPS.filter((op) => allows(p.grade, op) || (p.accuracy[op]?.attempts ?? 0) > 0);
    const math = h('div', { class: 'math-bars' }, ...ops.map((op) => {
      const a = p.accuracy[op];
      const pct = a.attempts ? Math.round((a.firstTry / a.attempts) * 100) : 0;
      const lvl = (p.adaptive?.[op]?.level ?? 0) + 1;
      return h('div', { class: `math-row ${a.attempts && pct < 50 ? 'low' : ''}` },
        h('b', null, P.ops[op]),
        h('div', { class: 'bar-lg' }, h('i', { style: `width:${pct}%` })),
        h('span', null, a.attempts ? t(P.accuracy, { pct, ok: a.firstTry, n: a.attempts }) : P.noAttempts),
        h('small', { class: 'chip' }, t(D.difficulty, { n: lvl })),
      );
    }));
    const weak = weakestOp(p.accuracy);
    const attempts = OPS.reduce((n, op) => n + (p.accuracy[op]?.attempts ?? 0), 0);
    const verdict = weak
      ? h('p', { class: 'stock-tip' }, img('icon_target'), t(D.weak, { op: P.ops[weak.op], pct: weak.pct }))
      : h('p', { class: 'hint' }, attempts >= 10 ? D.allGood : D.fewData);

    const hist = p.history.slice(-7).reverse();
    const history = hist.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'students' },
        h('thead', null, h('tr', null, ...Object.values(P.cols).map((c) => h('th', null, c)))),
        h('tbody', null, ...hist.map((r) => h('tr', null,
          h('td', null, String(r.day)), h('td', null, `${r.revenue} ₾`), h('td', null, `${r.expenses} ₾`),
          h('td', { class: r.profit >= 0 ? 'pos' : 'neg' }, `${r.profit} ₾`), h('td', null, String(r.customers)), h('td', null, String(r.stars)))))))
      : h('p', { class: 'hint' }, P.noHistory);

    const badges = p.badges.length
      ? h('div', { class: 'info-strip' }, ...p.badges.map((id) => {
        const meta = S.badges.list[id];
        const n = BADGES.find((b) => b.id === id)?.target(p.grade) ?? '';
        return h('span', { class: 'chip ok' }, img('badge_gold'), meta ? t(meta.name, { n }) : id);
      }))
      : h('p', { class: 'hint' }, D.noBadges);

    body = h('div', { class: 'panel-body student-detail' },
      chips,
      h('h3', null, D.math), math, verdict,
      h('h3', null, D.history), history,
      h('h3', null, D.badges), badges,
    );
  }
  const panel = h('div', { class: 'panel modal bounce-in detail-modal' },
    h('div', { class: 'panel-head' }, img('icon_chef_hat'), h('h2', null, t(D.title, { name: d.nickname })),
      h('button', { class: 'btn white round', 'aria-label': D.close, onClick: () => close() }, '✕')),
    body,
    h('div', { class: 'panel-foot' }, h('span', { style: 'flex:1' }), button(D.close, () => close(), 'green')),
  );
  close = openModal(panel);
}

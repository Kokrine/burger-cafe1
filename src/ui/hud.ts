// HUD: ზედა მარჯვნივ — ფული, დღე, დონე, ხმა, პაუზა; ზედა მარცხნივ — ვარსკვლავები და ქულები.
// ფული და ვარსკვლავები ცალ-ცალკე ჩანს — ეს ორი ვალუტა არასდროს ერევა.
import { S } from '../i18n/strings.ka';
import { store } from '../core/store';
import type { Progress } from '../core/types';
import { h, img } from './dom';
import { layers } from './layers';
import { openPause } from './pause';
import { bus } from '../core/bus';
import { session } from '../core/session';
import { isPlaying } from '../core/auth';

let prev: Pick<Progress, 'money' | 'stars' | 'points'> | null = null;

export function mountHud() {
  render(store.get());
  store.subscribe(render);
  bus.on('session', () => render(store.get()));
  bus.on('session-changed', () => render(store.get()));
}

function pill(icon: string, label: string, value: string | number, cls = '', bump = false) {
  const v = h('span', { class: bump ? 'pop-num' : '' }, value);
  return h('div', { class: `pill ${cls}` }, img(icon), h('div', null, h('small', null, label), v));
}

function goalPill() {
  const pct = session.goal ? Math.min(100, (session.earned / session.goal) * 100) : 0;
  return h('div', { class: 'pill' }, img('icon_target'),
    h('div', null, h('small', null, `${S.hud.goal}: ${session.goal} ${S.currency}`), h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` }))));
}

function render(p: Progress) {
  if (!isPlaying()) { layers.hud.replaceChildren(); prev = null; return; }
  const bump = (k: 'money' | 'stars' | 'points') => prev !== null && prev[k] !== p[k];
  const right = h('div', { class: 'hud-right interactive' },
    pill('coin', S.hud.money, `${p.money} ${S.currency}`, '', bump('money')),
    session.active ? goalPill() : null,
    pill('icon_calendar', S.hud.day, p.day),
    session.active ? pill('icon_clock', S.hud.time, session.clock) : pill('icon_level_up', S.hud.level, p.cafeLevel),
    h('div', { class: 'hud-buttons' },
      h('button', {
        class: 'btn white round', title: p.settings.sound ? S.hud.soundOn : S.hud.soundOff, 'aria-label': S.hud.soundOn,
        onClick: () => store.update((q) => { q.settings.sound = !q.settings.sound; }),
      }, img(p.settings.sound ? 'icon_sound_on' : 'icon_sound_off')),
      h('button', { class: 'btn white round', title: S.hud.pause, 'aria-label': S.hud.pause, onClick: openPause }, img('icon_pause')),
    ),
  );
  const left = h('div', { class: 'hud-left' },
    pill('star', S.hud.stars, p.stars, 'stars', bump('stars')),
    pill('icon_sparkle', S.hud.points, p.points, 'stars', bump('points')),
  );
  layers.hud.replaceChildren(left, right);
  prev = { money: p.money, stars: p.stars, points: p.points };
}

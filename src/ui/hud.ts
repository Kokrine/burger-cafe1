// HUD: ზედა მარჯვნივ — ფული, დღე, დონე, ხმა, პაუზა; ზედა მარცხნივ — ვარსკვლავები და ქულები.
// ფული და ვარსკვლავები ცალ-ცალკე ჩანს — ეს ორი ვალუტა არასდროს ერევა.
//
// HUD ერთხელ იხატება და შემდეგ მხოლოდ რიცხვები/ზოლი იცვლება ადგილზე: სამუშაო დღის საათი
// წამში ორჯერ ახლდება და მთლიანი ხელახლა ხატვისას iPhone-ზე ხატულები ციმციმებდა.
import { S } from '../i18n/strings.ka';
import { store } from '../core/store';
import type { Progress } from '../core/types';
import { h, img } from './dom';
import { layers } from './layers';
import { openPause } from './pause';
import { bus } from '../core/bus';
import { session } from '../core/session';
import { isPlaying } from '../core/auth';

type Key = 'money' | 'stars' | 'points';

/** სტრუქტურის გასაღები: თუ ეს შეიცვალა — HUD თავიდან იხატება (სხვა შემთხვევაში მხოლოდ მნიშვნელობები). */
let shape = '';
let prev: Pick<Progress, Key> | null = null;
let refs: {
  money: HTMLElement; stars: HTMLElement; points: HTMLElement; day: HTMLElement;
  levelOrClock: HTMLElement; goalLabel?: HTMLElement; goalBar?: HTMLElement; soundImg: HTMLImageElement; soundBtn: HTMLElement;
} | null = null;

export function mountHud() {
  render(store.get());
  store.subscribe(render);
  bus.on('session', () => render(store.get()));
  bus.on('session-changed', () => { shape = ''; render(store.get()); });
}

function pill(icon: string, label: string, cls = '') {
  const v = h('span', null);
  const el = h('div', { class: `pill ${cls}` }, img(icon), h('div', null, h('small', null, label), v));
  return { el, v };
}

/** მნიშვნელობის შეცვლა ადგილზე; ცვლილებისას — პატარა „ახტომა". */
function setText(el: HTMLElement, text: string, bump = false) {
  if (el.textContent === text) return;
  el.textContent = text;
  if (!bump) return;
  el.classList.remove('pop-num');
  void el.offsetWidth; // ანიმაციის თავიდან გაშვება
  el.classList.add('pop-num');
}

function build(p: Progress) {
  const money = pill('coin', S.hud.money);
  const day = pill('icon_calendar', S.hud.day);
  const lv = session.active ? pill('icon_clock', S.hud.time) : pill('icon_level_up', S.hud.level);
  let goalLabel: HTMLElement | undefined, goalBar: HTMLElement | undefined;
  let goal: HTMLElement | null = null;
  if (session.active) {
    goalLabel = h('small', null);
    goalBar = h('i', null);
    goal = h('div', { class: 'pill' }, img('icon_target'), h('div', null, goalLabel, h('div', { class: 'bar' }, goalBar)));
  }
  const soundImg = img(p.settings.sound ? 'icon_sound_on' : 'icon_sound_off') as HTMLImageElement;
  const soundBtn = h('button', {
    class: 'btn white round', 'aria-label': S.hud.soundOn,
    onClick: () => store.update((q) => { q.settings.sound = !q.settings.sound; }),
  }, soundImg);
  const right = h('div', { class: 'hud-right interactive' },
    money.el, goal, day.el, lv.el,
    h('div', { class: 'hud-buttons' },
      soundBtn,
      h('button', { class: 'btn white round', title: S.hud.pause, 'aria-label': S.hud.pause, onClick: openPause }, img('icon_pause')),
    ),
  );
  const stars = pill('star', S.hud.stars, 'stars');
  const points = pill('icon_sparkle', S.hud.points, 'stars');
  layers.hud.replaceChildren(h('div', { class: 'hud-left' }, stars.el, points.el), right);
  refs = { money: money.v, stars: stars.v, points: points.v, day: day.v, levelOrClock: lv.v, goalLabel, goalBar, soundImg, soundBtn };
}

function render(p: Progress) {
  if (!isPlaying()) { layers.hud.replaceChildren(); prev = null; refs = null; shape = ''; return; }
  const nextShape = session.active ? 'service' : 'menu';
  if (nextShape !== shape || !refs) { shape = nextShape; build(p); }
  const r = refs!;
  const bump = (k: Key) => prev !== null && prev[k] !== p[k];
  setText(r.money, `${p.money} ${S.currency}`, bump('money'));
  setText(r.stars, String(p.stars), bump('stars'));
  setText(r.points, String(p.points), bump('points'));
  setText(r.day, String(p.day));
  setText(r.levelOrClock, session.active ? session.clock : String(p.cafeLevel));
  if (r.goalLabel && r.goalBar) {
    setText(r.goalLabel, `${S.hud.goal}: ${session.goal} ${S.currency}`);
    const pct = session.goal ? Math.min(100, (session.earned / session.goal) * 100) : 0;
    const w = `${pct}%`;
    if (r.goalBar.style.width !== w) r.goalBar.style.width = w;
  }
  const icon = `${import.meta.env.BASE_URL}assets/${p.settings.sound ? 'icon_sound_on' : 'icon_sound_off'}.svg`;
  if (!r.soundImg.src.endsWith(icon)) r.soundImg.src = icon;
  r.soundBtn.title = p.settings.sound ? S.hud.soundOn : S.hud.soundOff;
  prev = { money: p.money, stars: p.stars, points: p.points };
}

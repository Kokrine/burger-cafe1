// DOM ეფექტები Phaser-ის ტილოს თავზე: მონეტები HUD-ისკენ, დღის აბრა.
import { h, img } from './dom';
import { layers } from './layers';
import { play } from '../audio/sfx';

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** ლოგიკური (1600×900) წერტილი → გვერდის კოორდინატი. */
export function toPage(x: number, y: number): [number, number] {
  const c = document.querySelector('#game canvas') as HTMLCanvasElement | null;
  if (!c) return [x, y];
  const r = c.getBoundingClientRect();
  return [r.left + (x / 1600) * r.width, r.top + (y / 900) * r.height];
}

/** მონეტები მიფრინავს HUD-ის ფულის ბლოკისკენ. */
export function flyCoins(x: number, y: number, n: number) {
  const target = document.querySelector('.hud-right .pill') as HTMLElement | null;
  if (!target) return;
  const [sx, sy] = toPage(x, y);
  const t = target.getBoundingClientRect();
  const tx = t.left + 26, ty = t.top + t.height / 2;
  const count = Math.max(1, Math.min(8, n));
  for (let i = 0; i < count; i++) {
    const c = img('coin', 'fly-coin');
    c.style.left = `${sx - 18}px`;
    c.style.top = `${sy - 18}px`;
    layers.toast.append(c);
    const dx = tx - sx, dy = ty - sy;
    const mid = { x: (Math.random() - 0.5) * 120, y: -60 - Math.random() * 60 };
    const anim = c.animate([
      { transform: 'translate(0,0) scale(.6)', opacity: 0 },
      { transform: `translate(${mid.x}px, ${mid.y}px) scale(1.1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 1 },
    ], { duration: reducedMotion() ? 300 : 700 + i * 70, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    anim.onfinish = () => {
      c.remove();
      if (i === count - 1) {
        target.classList.remove('bump');
        void target.offsetWidth;
        target.classList.add('bump');
        play('coins');
      }
    };
  }
}

/** დიდი აბრა ეკრანის ზემოთ: „კაფე გაიხსნა!" / „კაფე დაიკეტა". */
export function banner(text: string, icon: string, tone: 'open' | 'close') {
  const el = h('div', { class: `day-banner ${tone}` }, img(icon), h('span', null, text));
  layers.toast.append(el);
  play(tone === 'open' ? 'open' : 'close');
  window.setTimeout(() => el.classList.add('out'), 1800);
  window.setTimeout(() => el.remove(), 2400);
}

// საკვები, ფული და იკონები.
// ბურგერის ფენები გვერდიდან ჩანს (სიგანე 128). `stack` = რამდენ პიქსელს მატებს
// ფენა დასტას — თამაში ამით აწყობს ბურგერს. `base` = ფენის ქვედა ხაზი სურათში (ნაგულისხმევად h − 4);
// ყველს და სოუსებს წვეთები ქვედა ფენაზე ჩამოსდით (base-ს ქვემოთ), რომ თხელი ფენაც კარგად ჩანდეს.
import { C, SW, write, shaded, gloss, softShadow, isoEllipse, inkStroke, lari, n } from './lib.mjs';

// ---------- ბურგერის ფენები ----------
export const layer = {
  bun_bottom() {
    const shape = (a) => `<path d="M 9 6 L 119 6 Q 124 6 124 11 L 122 21 Q 119 31 107 31 L 21 31 Q 9 31 6 21 L 4 11 Q 4 6 9 6 Z" ${a}/>`;
    const crumb = `<rect x="0" y="0" width="128" height="11" fill="${C.bunCrumb}"/><path d="M 4 11 L 124 11" stroke="${C.bunDark}" stroke-width="1.6" opacity="0.6"/>`;
    return { w: 128, h: 36, stack: 22, body: shaded(shape, { base: C.bun, dark: C.bunDark, extra: crumb }) };
  },
  patty() {
    const shape = (a) => `<path d="M 10 7 Q 30 3 50 6 Q 70 2 90 6 Q 110 3 118 8 Q 125 15 119 23 Q 100 28 80 25 Q 60 29 40 25 Q 20 29 10 23 Q 3 15 10 7 Z" ${a}/>`;
    const specks = [[24, 13], [44, 18], [66, 12], [88, 17], [106, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${C.pattyLight}"/>`).join('');
    return { w: 128, h: 32, stack: 18, body: shaded(shape, { base: C.patty, dark: C.pattyDark, extra: specks, hl: gloss(30, 9, 12, 2.5, -4, 0.3) }) };
  },
  cheese() {
    const shape = (a) => `<path d="M 2 4 L 130 4 L 130 13 L 119 13 L 113 26 Q 109 31 105 26 L 99 13 L 75 13 L 69 22 Q 65 27 61 22 L 55 13 L 35 13 L 28 27 Q 24 32 20 27 L 14 13 L 2 13 Z" ${a}/>`;
    return { w: 132, h: 33, base: 13, stack: 9, body: shaded(shape, { base: C.cheese, dark: C.cheeseDark, off: [-2, -3], hl: gloss(30, 8, 14, 1.5, 0, 0.6) }) };
  },
  tomato() {
    let s = '';
    for (const [x, w] of [[7, 58], [62, 59]]) {
      s += shaded((a) => `<rect x="${x}" y="5" width="${w}" height="13" rx="6.5" ${a}/>`, {
        base: C.tomato, dark: C.tomatoDark, off: [-2, -3],
        extra: [0.3, 0.5, 0.7].map((f) => `<ellipse cx="${x + w * f}" cy="11.5" rx="3.5" ry="2" fill="${C.tomatoSeed}"/>`).join(''),
      });
    }
    return { w: 128, h: 22, stack: 10, body: s };
  },
  lettuce() {
    const shape = (a) => `<path d="M 4 11 Q 12 2 22 8 Q 32 2 42 8 Q 52 2 62 8 Q 72 2 82 8 Q 92 2 102 8 Q 112 2 122 8 Q 134 7 132 15 Q 126 23 116 18 Q 106 24 96 18 Q 86 24 76 18 Q 66 24 56 18 Q 46 24 36 18 Q 26 24 16 18 Q 3 21 4 11 Z" ${a}/>`;
    const veins = [22, 42, 62, 82, 102, 122].map((x) => `<path d="M ${x} 8 L ${x - 4} 17" stroke="${C.lettuceLight}" stroke-width="2"/>`).join('');
    return { w: 136, h: 26, stack: 9, body: shaded(shape, { base: C.lettuce, dark: C.lettuceDark, off: [-2, -3], extra: veins }) };
  },
  onion() {
    let s = '';
    for (const x of [8, 46, 84]) {
      s += shaded((a) => `<rect x="${x}" y="5" width="36" height="9" rx="4.5" ${a}/>`, { base: C.onion, dark: C.onionDark, off: [-1.5, -2], sw: SW.inner + 0.5 });
      s += `<path d="M ${x + 6} 9.5 L ${x + 30} 9.5" stroke="${C.onionRing}" stroke-width="1.8"/>`;
    }
    return { w: 128, h: 18, stack: 6, body: s };
  },
  ketchup() { return sauce(C.ketchup, C.ketchupDark, C.ketchupLight); },
  mayo() { return sauce(C.mayo, C.mayoDark, C.mayoLight); },
  bun_top() {
    const shape = (a) => `<path d="M 6 49 Q 3 40 10 30 Q 26 6 64 6 Q 102 6 118 30 Q 125 40 122 49 Q 120 53 114 53 L 14 53 Q 8 53 6 49 Z" ${a}/>`;
    const seeds = [[38, 22, -30], [58, 15, -10], [80, 17, 15], [98, 27, 35], [50, 32, -15], [72, 30, 10], [88, 40, 25], [30, 38, -35]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="4.2" ry="2.3" transform="rotate(${r} ${x} ${y})" fill="${C.sesame}" stroke="${C.bunDark}" stroke-width="1.4"/>`).join('');
    return { w: 128, h: 58, stack: 30, body: shaded(shape, { base: C.bun, dark: C.bunDark, off: [-5, -6], extra: seeds, hl: gloss(40, 20, 18, 6, -25, 0.55) }) };
  },
};

function sauce(base, dark, light) {
  // სქელი ზოლი + 4 გრძელი წვეთი — შეკვეთის პატარა ბუშტშიც კარგად უნდა ჩანდეს
  const shape = (a) => `<path d="M 6 6 Q 36 1 64 5 Q 92 1 122 6 Q 129 10 122 14 L 112 14 Q 110 27 104 27 Q 98 27 97 14 L 80 14 Q 78 22 74 22 Q 70 22 69 14 L 52 14 Q 50 33 43 33 Q 36 33 35 14 L 22 14 Q 20 22 16 22 Q 12 22 11 14 L 6 14 Q -1 10 6 6 Z" ${a}/>`;
  const hl = gloss(32, 8, 12, 1.8, 0, 0.8) + gloss(41, 25, 2.2, 4, 0, 0.75) + gloss(102, 20, 2, 3, 0, 0.7);
  return { w: 128, h: 37, base: 14, stack: 9, body: shaded(shape, { base, dark, off: [-1.5, -2.5], sw: SW.inner + 1.5, hl }) };
  void light;
}

// ---------- გრილის კოტლეტი (იზომეტრიულად, ზემოდან) ----------
function grillPatty(state) {
  const pal = {
    raw: [C.pattyRaw, C.pattyRawDark, C.pattyRawLight],
    ready: [C.patty, C.pattyDark, C.pattyLight],
    burnt: [C.pattyBurnt, C.pattyBurntDark, C.pattyBurntLight],
  }[state];
  const cx = 30, cy = 18, r = 15;
  let s = '';
  // გვერდი (სისქე)
  s += isoEllipse(cx, cy + 6, r, `fill="${pal[1]}" stroke="${C.ink}" stroke-width="${SW.outline}"`);
  s += `<rect x="${n(cx - r * Math.SQRT2)}" y="${cy}" width="${n(2 * r * Math.SQRT2)}" height="6" fill="${pal[1]}"/>`;
  s += shaded((a) => isoEllipse(cx, cy, r, a), { base: pal[0], dark: pal[1], off: [-2, -2], sw: 0 });
  s += isoEllipse(cx, cy, r, `fill="none" stroke="${C.ink}" stroke-width="${SW.inner}"`);
  if (state === 'raw') {
    s += [[22, 14], [34, 20], [40, 13], [26, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${pal[2]}"/>`).join('');
  } else if (state === 'ready') {
    for (const k of [-8, 0, 8]) s += `<path d="M ${cx - 12 + k} ${cy - 6 + k * 0.1} L ${cx + 4 + k} ${cy + 6 + k * 0.1}" stroke="${C.pattyDark}" stroke-width="3"/>`;
    s += gloss(22, 13, 6, 2, -20, 0.45);
  } else {
    s += `<path d="M 18 16 L 24 20 L 21 24 M 36 12 L 42 17 M 30 20 L 35 24" stroke="#120B09" stroke-width="2.4"/>`;
  }
  return s;
}

// ---------- სასმელი, ფრი ----------
function drink() {
  let s = softShadow(28, 78, 18, 4);
  const cup = (a) => `<path d="M 10 22 L 46 22 L 41 74 Q 40 78 36 78 L 20 78 Q 16 78 15 74 Z" ${a}/>`;
  s += shaded(cup, {
    base: C.cupWhite, dark: C.cupShade,
    extra: `<rect x="0" y="40" width="60" height="16" fill="${C.counter}"/>` +
      `<circle cx="28" cy="48" r="5" fill="${C.cheese}" stroke="${C.ink}" stroke-width="1.6"/>`,
    hl: gloss(18, 32, 3, 9, 0, 0.6),
  });
  s += `<path d="M 32 18 L 42 2" stroke="${C.ink}" stroke-width="7.5"/><path d="M 32 18 L 42 2" stroke="${C.teal}" stroke-width="3.5"/>`;
  s += shaded((a) => `<rect x="6" y="15" width="44" height="10" rx="5" ${a}/>`, { base: C.cupWhite, dark: C.cupShade, off: [-1.5, -2.5] });
  return s;
}

function fries() {
  let s = softShadow(32, 76, 22, 4);
  const sticks = [[14, 30, -10], [22, 20, -5], [30, 16, 0], [38, 20, 6], [46, 28, 12], [26, 26, -2], [40, 24, 4]];
  for (const [x, y, r] of sticks) {
    s += `<g transform="rotate(${r} ${x} 50)">` + shaded((a) => `<rect x="${x - 3.5}" y="${y}" width="7" height="34" rx="2.5" ${a}/>`, { base: C.cheese, dark: C.cheeseDark, off: [-1.5, -1.5], sw: SW.inner }) + '</g>';
  }
  const box = (a) => `<path d="M 8 40 L 56 40 L 50 76 Q 49 79 46 79 L 18 79 Q 15 79 14 76 Z" ${a}/>`;
  s += shaded(box, { base: C.counter, dark: C.counterDark, hl: gloss(20, 50, 3, 10, -8, 0.4), extra: `<path d="M 8 40 Q 32 54 56 40" fill="none" stroke="${C.counterLight}" stroke-width="3"/>` });
  s += `<path d="M 24 58 Q 32 66 40 58" fill="none" stroke="${C.white}" stroke-width="3.5"/><circle cx="26" cy="52" r="2.2" fill="${C.white}"/><circle cx="38" cy="52" r="2.2" fill="${C.white}"/>`;
  return s;
}

// ---------- ფული და ვარსკვლავი ----------
function coin() {
  let s = shaded((a) => `<circle cx="24" cy="24" r="19" ${a}/>`, { base: C.coin, dark: C.coinDark, off: [-2.5, -3], hl: gloss(16, 15, 6, 3.5, -40, 0.7) });
  s += `<circle cx="24" cy="24" r="12.5" fill="none" stroke="${C.coinDark}" stroke-width="2.2"/>`;
  s += lari(24.5, 24, 16, C.coinDark, 2.4);
  return s;
}

function star() {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 25 : 11.5;
    p.push(`${n(30 + r * Math.cos(ang))},${n(31 + r * Math.sin(ang))}`);
  }
  const shape = (a) => `<polygon points="${p.join(' ')}" ${a}/>`;
  return shaded(shape, { base: C.star, dark: C.starDark, off: [-2.5, -3], hl: gloss(22, 22, 5, 3, -35, 0.75) });
}

function bill() {
  let s = shaded((a) => `<rect x="4" y="6" width="76" height="40" rx="6" ${a}/>`, { base: C.bill, dark: C.billDark, off: [-2.5, -3] });
  s += `<rect x="10" y="12" width="62" height="28" rx="4" fill="none" stroke="${C.billLight}" stroke-width="2"/>`;
  s += `<circle cx="41" cy="26" r="10" fill="${C.billLight}" stroke="${C.billDark}" stroke-width="1.8"/>`;
  s += lari(41.5, 26, 12, C.billDark, 2);
  return s;
}

// ---------- HUD იკონები ----------
function iconClock() {
  let s = shaded((a) => `<circle cx="24" cy="24" r="19" ${a}/>`, { base: C.paper, dark: C.cupShade, off: [-2, -2.5] });
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2;
    s += `<circle cx="${n(24 + 14 * Math.sin(a))}" cy="${n(24 - 14 * Math.cos(a))}" r="1.7" fill="${C.ink}"/>`;
  }
  s += `<path d="M 24 24 L 24 13 M 24 24 L 31 28" stroke="${C.ink}" stroke-width="3"/><circle cx="24" cy="24" r="2.6" fill="${C.counter}"/>`;
  return s;
}

function iconTarget() {
  let s = '';
  const rings = [[19, C.counter, C.counterDark], [13, C.white, C.cupShade], [7, C.counter, C.counterDark]];
  for (const [r, b, d] of rings) s += shaded((a) => `<circle cx="24" cy="24" r="${r}" ${a}/>`, { base: b, dark: d, off: [-1.5, -2], sw: SW.inner + (r === 19 ? 2 : 0) });
  s += `<path d="M 24 24 L 40 8" stroke="${C.ink}" stroke-width="3"/><path d="M 36 6 L 42 6 L 42 12" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
  return s;
}

function iconCalendar() {
  let s = shaded((a) => `<rect x="6" y="9" width="36" height="34" rx="6" ${a}/>`, { base: C.paper, dark: C.cupShade, off: [-2, -2.5] });
  s += `<path d="M 6 15 Q 6 9 12 9 L 36 9 Q 42 9 42 15 L 42 20 L 6 20 Z" fill="${C.counter}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
  s += `<path d="M 15 5 L 15 13 M 33 5 L 33 13" stroke="${C.ink}" stroke-width="3.5"/>`;
  s += `<rect x="6" y="9" width="36" height="34" rx="6" ${inkStroke()}/>`;
  return s;
}

export function buildFood() {
  for (const [name, fn] of Object.entries(layer)) {
    const L = fn();
    write(`layer_${name}`, L.w, L.h, L.body, { anchor: [L.w / 2, L.base ?? L.h - 4], stack: L.stack, kind: 'layer' });
  }
  for (const st of ['raw', 'ready', 'burnt']) write(`grill_patty_${st}`, 60, 34, grillPatty(st), { anchor: [30, 20], kind: 'grill' });
  write('drink_cola', 56, 84, drink(), { anchor: [28, 78] });
  write('fries', 64, 84, fries(), { anchor: [32, 78] });
  write('coin', 48, 48, coin(), { anchor: [24, 24] });
  write('star', 60, 60, star(), { anchor: [30, 31] });
  write('bill', 84, 52, bill(), { anchor: [42, 26] });
  write('icon_clock', 48, 48, iconClock(), { anchor: [24, 24] });
  write('icon_target', 48, 48, iconTarget(), { anchor: [24, 24] });
  write('icon_calendar', 48, 48, iconCalendar(), { anchor: [24, 24] });
}

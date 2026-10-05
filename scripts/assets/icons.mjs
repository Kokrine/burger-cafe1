// მენიუს პროდუქტების და ინტერფეისის იკონები (წინიდან, არა იზომეტრიულად).
import { C, SW, write, shaded, gloss, inkStroke, n } from './lib.mjs';
import { layer } from './food.mjs';

// ---------- მენიუ ----------
function burgerIcon(middle, k = 0.68, size = 96) {
  const layers = ['bun_bottom', ...middle, 'bun_top'].map((l) => layer[l]());
  const baseOf = (L) => L.base ?? L.h - 4;
  const total = layers.reduce((a, L, i) => a + (i < layers.length - 1 ? L.stack : baseOf(L)), 0) * k;
  let y = size / 2 + total / 2 + 2;
  let s = '';
  for (const L of layers) {
    s += `<g transform="translate(${n(size / 2 - (L.w / 2) * k)} ${n(y - baseOf(L) * k)}) scale(${k})">${L.body}</g>`;
    y -= L.stack * k;
  }
  return s;
}

function iceCream() {
  let s = shaded((a) => `<path d="M 34 50 L 48 90 L 62 50 Z" ${a}/>`, { base: C.bunLight, dark: C.bun });
  s += `<path d="M 40 58 L 56 74 M 56 58 L 42 78 M 38 52 L 58 52" stroke="${C.bunDark}" stroke-width="2"/>`;
  const scoops = [[48, 44, 17, '#FF9EB8', '#E2728F'], [48, 26, 13, '#FFF4D2', '#E8D49A']];
  for (const [x, y, r, b, d] of scoops) s += shaded((a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`, { base: b, dark: d, hl: gloss(x - r * 0.4, y - r * 0.4, r * 0.35, r * 0.2, -30, 0.6) });
  s += shaded((a) => `<circle cx="51" cy="12" r="6" ${a}/>`, { base: C.counter, dark: C.counterDark, off: [-1.5, -1.5] });
  return s;
}

function juice() {
  let s = shaded((a) => `<path d="M 28 26 L 68 26 L 62 88 Q 61 92 57 92 L 39 92 Q 35 92 34 88 Z" ${a}/>`, {
    base: '#FFB347', dark: '#F08A24', hl: gloss(38, 44, 3, 12, 0, 0.6),
    extra: `<rect x="20" y="20" width="60" height="14" fill="#fff" opacity="0.7"/>`,
  });
  s += `<path d="M 54 30 L 66 6" stroke="${C.ink}" stroke-width="8"/><path d="M 54 30 L 66 6" stroke="${C.lettuce}" stroke-width="4"/>`;
  s += shaded((a) => `<path d="M 60 24 A 13 13 0 0 1 86 24 Z" ${a}/>`, { base: '#FFC94A', dark: '#F08A24', sw: SW.inner + 1 });
  s += `<path d="M 73 24 L 73 14 M 73 24 L 66 17 M 73 24 L 80 17" stroke="#fff" stroke-width="2"/>`;
  return s;
}

// ---------- UI იკონები 48×48 ----------
const ui = {
  lock() {
    let s = `<path d="M 15 22 L 15 16 A 9 9 0 0 1 33 16 L 33 22" fill="none" stroke="${C.ink}" stroke-width="9"/><path d="M 15 22 L 15 16 A 9 9 0 0 1 33 16 L 33 22" fill="none" stroke="${C.steel}" stroke-width="4.5"/>`;
    s += shaded((a) => `<rect x="9" y="21" width="30" height="22" rx="5" ${a}/>`, { base: C.coin, dark: C.coinDark, hl: gloss(15, 26, 4, 2, 0, 0.6) });
    s += `<circle cx="24" cy="30" r="3.5" fill="${C.ink}"/><rect x="22.5" y="31" width="3" height="7" fill="${C.ink}"/>`;
    return s;
  },
  store() {
    let s = shaded((a) => `<rect x="8" y="20" width="32" height="22" ${a}/>`, { base: C.paper, dark: C.cupShade });
    s += `<rect x="14" y="27" width="10" height="15" fill="${C.teal}" stroke="${C.ink}" stroke-width="2"/><rect x="28" y="27" width="8" height="7" fill="${C.skyLight}" stroke="${C.ink}" stroke-width="2"/>`;
    s += `<path d="M 5 20 L 9 8 L 39 8 L 43 20 Z" fill="${C.counter}" stroke="${C.ink}" stroke-width="${SW.outline}"/>`;
    for (const x of [15, 24, 33]) s += `<path d="M ${x - 2} 8 L ${x - 4} 20 L ${x + 4} 20 L ${x + 2} 8 Z" fill="#fff"/>`;
    s += `<path d="M 5 20 L 9 8 L 39 8 L 43 20 Z" ${inkStroke(SW.outline)}/>`;
    return s;
  },
  box() {
    let s = shaded((a) => `<rect x="7" y="14" width="34" height="28" rx="3" ${a}/>`, { base: C.wood, dark: C.woodDark, hl: gloss(14, 20, 5, 2, 0, 0.4) });
    s += `<path d="M 7 24 L 41 24 M 24 14 L 24 24" stroke="${C.ink}" stroke-width="${SW.inner}"/><rect x="19" y="29" width="10" height="5" rx="2" fill="${C.ink}" opacity="0.6"/>`;
    return s;
  },
  check() {
    return shaded((a) => `<circle cx="24" cy="24" r="18" ${a}/>`, { base: C.success, dark: C.successDark }) + `<path d="M 15 24 L 22 31 L 34 17" fill="none" stroke="#fff" stroke-width="5"/>`;
  },
  sound_on() {
    let s = shaded((a) => `<path d="M 8 19 L 16 19 L 26 10 L 26 38 L 16 29 L 8 29 Z" ${a}/>`, { base: C.primary, dark: C.primaryDark });
    s += `<path d="M 31 18 Q 35 24 31 30 M 36 13 Q 43 24 36 35" fill="none" stroke="${C.ink}" stroke-width="3.5"/>`;
    return s;
  },
  sound_off() {
    let s = shaded((a) => `<path d="M 8 19 L 16 19 L 26 10 L 26 38 L 16 29 L 8 29 Z" ${a}/>`, { base: C.steel, dark: C.steelDark });
    s += `<path d="M 31 18 L 41 30 M 41 18 L 31 30" stroke="${C.danger}" stroke-width="4.5"/>`;
    return s;
  },
  pause() {
    return shaded((a) => `<circle cx="24" cy="24" r="18" ${a}/>`, { base: C.secondary, dark: C.secondaryDark }) +
      `<rect x="16" y="15" width="6" height="18" rx="2" fill="#fff"/><rect x="26" y="15" width="6" height="18" rx="2" fill="#fff"/>`;
  },
  heart() {
    return shaded((a) => `<path d="M 24 40 C 8 30 5 20 9 14 C 13 8 21 9 24 15 C 27 9 35 8 39 14 C 43 20 40 30 24 40 Z" ${a}/>`, { base: C.danger, dark: C.dangerDark, hl: gloss(15, 16, 4, 2.5, -30, 0.6) });
  },
  people() {
    let s = '';
    for (const [x, c, d] of [[31, C.teal, C.tealDark], [18, C.primary, C.primaryDark]]) {
      s += shaded((a) => `<path d="M ${x - 11} 42 Q ${x - 11} 28 ${x} 28 Q ${x + 11} 28 ${x + 11} 42 Z" ${a}/>`, { base: c, dark: d });
      s += shaded((a) => `<circle cx="${x}" cy="18" r="8" ${a}/>`, { base: C.skin1, dark: C.skin1Dark });
    }
    return s;
  },
  bolt() {
    return shaded((a) => `<path d="M 28 4 L 10 27 L 22 27 L 18 44 L 38 19 L 26 19 Z" ${a}/>`, { base: C.cheese, dark: C.cheeseDark, hl: gloss(22, 16, 3, 6, 30, 0.6) });
  },
  level_up() {
    return shaded((a) => `<circle cx="24" cy="24" r="18" ${a}/>`, { base: C.primary, dark: C.primaryDark }) +
      `<path d="M 24 34 L 24 15 M 15 23 L 24 14 L 33 23" fill="none" stroke="#fff" stroke-width="5"/>`;
  },
  chef_hat() {
    return shaded((a) => `<path d="M 13 30 C 4 26 6 10 17 12 C 19 3 33 3 34 11 C 44 9 46 26 35 30 Z" ${a}/>`, { base: C.chefWhite, dark: C.chefShade, hl: gloss(16, 14, 5, 3, -20, 0.8) }) +
      shaded((a) => `<rect x="12" y="29" width="24" height="11" rx="3" ${a}/>`, { base: C.chefWhite, dark: C.chefShade });
  },
  menu_book() {
    let s = shaded((a) => `<rect x="9" y="7" width="30" height="36" rx="4" ${a}/>`, { base: C.counter, dark: C.counterDark });
    s += `<rect x="14" y="12" width="20" height="26" rx="2" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>`;
    s += `<path d="M 18 19 L 30 19 M 18 25 L 30 25 M 18 31 L 26 31" stroke="${C.inkSoft}" stroke-width="2.4"/>`;
    return s;
  },
  sparkle() {
    return shaded((a) => `<path d="M 24 4 Q 27 21 44 24 Q 27 27 24 44 Q 21 27 4 24 Q 21 21 24 4 Z" ${a}/>`, { base: C.star, dark: C.starDark, sw: SW.inner + 1 });
  },
};

// ---------- სამუშაო მაგიდა (წინიდან) ----------
function workbench(W = 1600, H = 330) {
  let s = `<rect x="0" y="34" width="${W}" height="${H - 34}" fill="${C.woodDark}"/>`;
  s += `<rect x="0" y="34" width="${W}" height="${H - 46}" fill="${C.wood}"/>`;
  for (let x = 0; x < W; x += 80) s += `<path d="M ${x} 46 L ${x} ${H}" stroke="${C.woodDark}" stroke-width="2.5"/>`;
  for (let x = 40; x < W; x += 160) s += `<path d="M ${x} 110 Q ${x + 18} 104 ${x + 30} 114" fill="none" stroke="${C.woodDark}" stroke-width="2" opacity="0.6"/>`;
  s += `<rect x="-4" y="6" width="${W + 8}" height="36" rx="8" fill="${C.steel}" stroke="${C.ink}" stroke-width="${SW.outline}"/>`;
  s += `<rect x="4" y="10" width="${W - 8}" height="12" rx="6" fill="${C.steelLight}"/>`;
  s += `<path d="M 30 14 L ${Math.min(400, W / 3)} 14" stroke="#fff" stroke-width="4" opacity="0.8"/>`;
  s += `<rect x="0" y="42" width="${W}" height="10" fill="#000" opacity="0.15"/>`;
  return s;
}

function bin() {
  let s = shaded((a) => `<path d="M 6 24 L 118 24 L 112 94 Q 111 100 104 100 L 20 100 Q 13 100 12 94 Z" ${a}/>`, {
    base: C.paper, dark: C.cupShade, hl: gloss(22, 40, 4, 12, -6, 0.6),
    extra: `<rect x="0" y="74" width="124" height="10" fill="${C.teal}"/>`,
  });
  s += shaded((a) => `<rect x="2" y="14" width="120" height="18" rx="8" ${a}/>`, { base: C.steelLight, dark: C.steel, off: [-2, -2] });
  s += `<rect x="10" y="18" width="104" height="9" rx="4" fill="${C.steelDark}"/>`;
  return s;
}

function plate() {
  let s = `<ellipse cx="124" cy="44" rx="118" ry="24" fill="${C.ink}" opacity="0.15"/>`;
  s += shaded((a) => `<ellipse cx="120" cy="36" rx="114" ry="28" ${a}/>`, { base: '#FFFFFF', dark: C.cupShade, off: [-3, -4] });
  s += `<ellipse cx="120" cy="34" rx="84" ry="17" fill="none" stroke="${C.cupShade}" stroke-width="3"/>`;
  s += gloss(70, 26, 26, 5, -4, 0.8);
  return s;
}

function trash() {
  let s = shaded((a) => `<path d="M 10 16 L 38 16 L 35 43 Q 34 45 31 45 L 17 45 Q 14 45 13 43 Z" ${a}/>`, { base: C.steel, dark: C.steelDark, hl: gloss(17, 26, 2, 6, 0, 0.6) });
  s += `<path d="M 19 22 L 20 39 M 24 22 L 24 39 M 29 22 L 28 39" stroke="${C.steelDark}" stroke-width="2.4"/>`;
  s += shaded((a) => `<rect x="6" y="9" width="36" height="8" rx="3" ${a}/>`, { base: C.steelLight, dark: C.steel, off: [-1, -1.5] });
  s += `<rect x="19" y="4" width="10" height="6" rx="2" fill="${C.steel}" stroke="${C.ink}" stroke-width="2"/>`;
  return s;
}

/** ბეჯის მედალი (ემბლემა CSS-ით ზემოდან ედება). gold — მოპოვებული, grey — ჩაკეტილი. */
function medal(gold) {
  const [base, dark, ribA, ribB] = gold
    ? [C.coin, C.coinDark, C.counter, C.teal]
    : ['#D5D9DE', '#A9B0B8', '#C9CED4', '#B8BEC6'];
  let s = '';
  s += `<path d="M 30 70 L 18 108 L 32 100 L 40 112 L 50 74 Z" fill="${ribA}" stroke="${C.ink}" stroke-width="${SW.inner + 1}"/>`;
  s += `<path d="M 66 70 L 78 108 L 64 100 L 56 112 L 46 74 Z" fill="${ribB}" stroke="${C.ink}" stroke-width="${SW.inner + 1}"/>`;
  const points = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 40 : 44;
    points.push(`${n(48 + r * Math.cos(a))},${n(46 + r * Math.sin(a))}`);
  }
  s += shaded((a) => `<polygon points="${points.join(' ')}" ${a}/>`, { base, dark, hl: gloss(34, 30, 10, 5, -35, 0.6) });
  s += `<circle cx="48" cy="46" r="31" fill="${gold ? '#FFF6D6' : '#F2F4F6'}" stroke="${dark}" stroke-width="3"/>`;
  return s;
}

export function buildIcons() {
  write('badge_gold', 96, 116, medal(true), { anchor: [48, 46], kind: 'ui' });
  write('badge_grey', 96, 116, medal(false), { anchor: [48, 46], kind: 'ui' });
  write('workbench', 1600, 330, workbench(), { anchor: [0, 0], kind: 'ui' });
  write('bin', 124, 104, bin(), { anchor: [62, 100], kind: 'ui' });
  write('plate', 244, 74, plate(), { anchor: [120, 36], kind: 'ui' });
  write('icon_trash', 48, 48, trash(), { anchor: [24, 24], kind: 'icon' });
  const menu = {
    menu_burger: burgerIcon(['patty', 'lettuce']),
    menu_cheeseburger: burgerIcon(['patty', 'cheese', 'tomato']),
    menu_double: burgerIcon(['patty', 'cheese', 'patty', 'cheese'], 0.6),
    menu_icecream: iceCream(),
    menu_juice: juice(),
  };
  for (const [k, body] of Object.entries(menu)) write(k, 96, 96, body, { anchor: [48, 48], kind: 'menu' });
  for (const [k, fn] of Object.entries(ui)) write(`icon_${k}`, 48, 48, fn(), { anchor: [24, 24], kind: 'icon' });
}

// ---------- აპის ხატულა (მთავარ ეკრანზე, 512×512) ----------
// shape: 'square' — iPhone (კუთხეებს თავად ამრგვალებს), 'round' — ჩვეულებრივი, 'maskable' — Android-ის ნიღბისთვის
// (ბურგერი უფრო პატარაა, რომ წრიულ/ოვალურ ჭრაში არ მოიჭრას).
export function appIconSvg(shape = 'square') {
  const S = 512;
  const f = (shape === 'maskable' ? 0.6 : 0.8) * S / 96;
  const off = (S - 96 * f) / 2;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6, b = a + Math.PI / 14, R = S;
    return `<path d="M 256 256 L ${n(256 + R * Math.cos(a))} ${n(256 + R * Math.sin(a))} L ${n(256 + R * Math.cos(b))} ${n(256 + R * Math.sin(b))} Z"/>`;
  }).join('');
  const rx = shape === 'round' ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" stroke-linejoin="round" stroke-linecap="round">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC45E"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient>
<clipPath id="frame"><rect width="${S}" height="${S}" rx="${rx}"/></clipPath></defs>
<g clip-path="url(#frame)">
<rect width="${S}" height="${S}" fill="url(#bg)"/>
<g fill="#FFFFFF" opacity="0.16">${rays}</g>
<circle cx="256" cy="256" r="${n(46 * f)}" fill="${C.cream}" opacity="0.55"/>
<ellipse cx="256" cy="${n(off + 86 * f)}" rx="${n(34 * f)}" ry="${n(5 * f)}" fill="${C.ink}" opacity="0.18"/>
<g transform="translate(${n(off)} ${n(off)}) scale(${n(f * 100) / 100})">${burgerIcon(['lettuce', 'tomato', 'patty'], 0.64)}</g>
</g>
</svg>
`;
}

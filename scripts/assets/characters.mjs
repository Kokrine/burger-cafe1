// პერსონაჟები: ერთიანი შაბლონი (140×220, ფეხები anchor-ზე 70,212).
// ემოციები (happy / neutral / angry) — დახატული სახე, არა ემოჯი.
import { C, SW, write, shaded, gloss, softShadow, limb, inkStroke } from './lib.mjs';

export const CHAR_W = 140;
export const CHAR_H = 220;
const HX = 70, HY = 84, R = 40;

// ---------- სახე ----------
export function face(mood, o = {}) {
  const ey = HY + 4;
  let s = '';
  if (mood === 'angry') {
    for (const sx of [-1, 1]) s += `<ellipse cx="${HX + sx * 25}" cy="${HY + 17}" rx="10" ry="6" fill="${C.angry}" opacity="0.35"/>`;
  } else {
    for (const sx of [-1, 1]) s += `<ellipse cx="${HX + sx * 25}" cy="${HY + 16}" rx="8" ry="5" fill="${C.blush}" opacity="0.6"/>`;
  }
  for (const sx of [-1, 1]) {
    const x = HX + sx * 15;
    if (mood === 'happy') {
      s += `<ellipse cx="${x}" cy="${ey}" rx="6.5" ry="8.5" fill="${C.ink}"/>`;
      s += `<circle cx="${x - 2}" cy="${ey - 3.5}" r="2.8" fill="#fff"/><circle cx="${x + 2.2}" cy="${ey + 3}" r="1.3" fill="#fff"/>`;
      if (!o.hideBrows) s += `<path d="M ${x - 7} ${ey - 15} Q ${x} ${ey - 21} ${x + 7} ${ey - 15}" ${inkStroke(3)}/>`;
    } else if (mood === 'neutral') {
      s += `<ellipse cx="${x}" cy="${ey + 1}" rx="5.5" ry="7" fill="${C.ink}"/>`;
      s += `<circle cx="${x - 1.8}" cy="${ey - 2}" r="2.2" fill="#fff"/>`;
      if (!o.hideBrows) s += `<path d="M ${x - 7} ${ey - 13} L ${x + 7} ${ey - 13}" ${inkStroke(3)}/>`;
    } else {
      s += `<ellipse cx="${x}" cy="${ey + 2}" rx="5.5" ry="6" fill="${C.ink}"/>`;
      s += `<circle cx="${x - 1.6}" cy="${ey}" r="1.9" fill="#fff"/>`;
      s += `<path d="M ${HX + sx * 23} ${ey - 16} L ${HX + sx * 8} ${ey - 8}" ${inkStroke(4.2)}/>`;
    }
  }
  s += `<path d="M ${HX - 3.5} ${HY + 13} Q ${HX} ${HY + 17} ${HX + 3.5} ${HY + 13}" ${inkStroke(2.4)}/>`;
  const my = HY + 22 + (o.mouthDy ?? 0);
  if (mood === 'happy') {
    s += `<clipPath id="m"><path d="M ${HX - 12} ${my} Q ${HX} ${my + 17} ${HX + 12} ${my} Z"/></clipPath>`;
    s += `<path d="M ${HX - 12} ${my} Q ${HX} ${my + 17} ${HX + 12} ${my} Z" fill="${C.mouth}"/>`;
    s += `<ellipse cx="${HX + 1}" cy="${my + 10}" rx="7" ry="4.5" fill="${C.tongue}" clip-path="url(#m)"/>`;
    s += `<path d="M ${HX - 12} ${my} Q ${HX} ${my + 17} ${HX + 12} ${my} Z" ${inkStroke(2.6)}/>`;
  } else if (mood === 'neutral') {
    s += `<path d="M ${HX - 8} ${my + 3} Q ${HX} ${my + 5} ${HX + 8} ${my + 2}" ${inkStroke(3)}/>`;
  } else {
    s += `<path d="M ${HX - 10} ${my + 8} Q ${HX} ${my - 1} ${HX + 10} ${my + 8}" ${inkStroke(3.4)}/>`;
  }
  return s;
}

// ---------- თმა ----------
// HAIR — თმის ფერები (ბაზა + ჩრდილი), რომლებიც მზარეულის არჩევისას ჩანს.
export const HAIR = {
  brown: [C.hairBrown, '#4E2C1A'],
  black: [C.hairBlack, '#1A1412'],
  blonde: [C.hairBlonde, '#D99E2B'],
  red: [C.hairRed, '#B04A1E'],
  gray: [C.hairGray, '#A39F9A'],
};
export const SKINS = {
  s1: [C.skin1, C.skin1Dark],
  s2: [C.skin2, C.skin2Dark],
  s3: [C.skin3, C.skin3Dark],
  s4: [C.skin4, C.skin4Dark],
};

const bangs = (a) => `<path d="M 30 88 C 26 50 50 38 70 38 C 92 38 114 50 110 88 C 105 72 97 62 87 60 C 82 69 72 71 65 64 C 57 71 45 70 41 63 C 35 70 32 78 30 88 Z" ${a}/>`;
const shortCut = (a) => `<path d="M 31 86 C 25 48 52 38 72 38 C 98 38 115 54 109 86 C 104 72 99 64 92 61 C 86 66 74 64 66 58 C 58 64 46 66 40 62 C 35 68 32 76 31 86 Z" ${a}/>`;

/** აბრუნებს { back, mid, front } — თავის უკან, ტანის თავზე და თავის თავზე. */
function hair(style, [base, dark]) {
  const sh = (shape, hl = '') => shaded(shape, { base, dark, hl });
  let back = '', mid = '', front = '';
  switch (style) {
    case 'puffs':
      back += sh((a) => `<circle cx="28" cy="58" r="17" ${a}/>`, gloss(23, 52, 6, 3.5, -30, 0.35));
      back += sh((a) => `<circle cx="112" cy="58" r="17" ${a}/>`, gloss(107, 52, 6, 3.5, -30, 0.35));
      front += sh(bangs, gloss(52, 48, 12, 4, -20, 0.3));
      front += `<circle cx="40" cy="64" r="5" fill="${C.counter}" stroke="${C.ink}" stroke-width="${SW.inner}"/><circle cx="100" cy="64" r="5" fill="${C.counter}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
      break;
    case 'ponytail':
      back += sh((a) => `<path d="M 100 70 C 128 66 134 100 122 124 C 118 112 112 98 98 92 Z" ${a}/>`);
      front += sh(bangs, gloss(52, 48, 12, 4, -20, 0.3));
      break;
    case 'braids':
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const x = HX + sx * (37 + i * 1.5), y = 102 + i * 13;
          mid += sh((a) => `<ellipse cx="${x}" cy="${y}" rx="${8.5 - i * 0.6}" ry="9" ${a}/>`);
        }
        mid += `<circle cx="${HX + sx * 43}" cy="154" r="4.5" fill="${C.teal}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
      }
      front += sh(bangs, gloss(52, 48, 12, 4, -20, 0.3));
      break;
    case 'short':
      front += sh(shortCut, gloss(54, 47, 12, 4, -20, 0.3));
      break;
    case 'curly': {
      const curls = [[33, 78, 11], [36, 62, 12], [46, 49, 12], [60, 41, 12], [76, 40, 12], [92, 46, 12], [103, 58, 12], [107, 75, 11]];
      for (const [x, y, r] of curls) front += sh((a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`);
      front += gloss(58, 38, 7, 3, -20, 0.3);
      break;
    }
    case 'bob':
      back += sh((a) => `<path d="M 26 114 C 18 70 34 36 70 36 C 106 36 122 70 114 114 Q 104 118 98 112 L 42 112 Q 36 118 26 114 Z" ${a}/>`);
      front += sh((a) => `<path d="M 30 86 C 28 52 48 38 70 38 C 92 38 112 52 110 86 C 105 76 101 68 99 64 L 41 64 C 39 68 35 76 30 86 Z" ${a}/>`, gloss(54, 46, 12, 4, -15, 0.35));
      break;
    case 'bun':
      back += sh((a) => `<circle cx="70" cy="34" r="15" ${a}/>`, gloss(64, 28, 5, 3, -30, 0.4));
      front += sh((a) => `<path d="M 30 86 C 26 54 48 42 70 42 C 92 42 114 54 110 86 C 104 72 92 60 70 60 C 48 60 36 72 30 86 Z" ${a}/>`);
      front += `<path d="M 70 44 Q 66 52 70 60" ${inkStroke(2)}/>`;
      break;
    case 'tufts':
      front += sh((a) => `<path d="M 30 92 C 27 76 30 66 36 62 L 40 84 Z M 110 92 C 113 76 110 66 104 62 L 100 84 Z" ${a}/>`);
      break;
  }
  return { back, mid, front };
}

// ---------- სხეული ----------
export function character(o, mood) {
  const [skin, skinDark] = o.skin;
  let s = softShadow(70, 212, 40, 8);
  const h = hair(o.hairStyle, o.hair);
  s += h.back;
  for (const x of [52, 74]) s += shaded((a) => `<rect x="${x}" y="168" width="16" height="38" rx="7" ${a}/>`, { base: o.pants, dark: o.pantsDark });
  for (const x of [58, 84]) s += shaded((a) => `<ellipse cx="${x}" cy="207" rx="13" ry="7" ${a}/>`, { base: o.shoe, dark: o.shoeDark ?? '#1E1412', hl: gloss(x - 4, 204, 4, 2, 0, 0.35) });
  const sleeve = o.sleeve ?? o.shirt, sleeveDark = o.sleeveDark ?? o.shirtDark;
  s += limb(44, 128, 34, 164, 16, sleeve, sleeveDark) + limb(96, 128, 106, 164, 16, sleeve, sleeveDark);
  for (const x of [33, 107]) s += shaded((a) => `<circle cx="${x}" cy="168" r="8.5" ${a}/>`, { base: skin, dark: skinDark });
  const torso = (a) => `<path d="M 47 120 Q 41 121 41 129 L 43 172 Q 43 178 50 178 L 90 178 Q 97 178 97 172 L 99 129 Q 99 121 93 120 Z" ${a}/>`;
  s += shaded(torso, { base: o.shirt, dark: o.shirtDark, extra: o.torsoExtra ? o.torsoExtra() : '', hl: gloss(54, 132, 8, 4, -30, 0.35) });
  if (o.overTorso) s += o.overTorso();
  s += shaded((a) => `<rect x="62" y="112" width="16" height="12" rx="4" ${a}/>`, { base: skinDark, dark: skinDark, sw: SW.inner });
  s += h.mid;
  for (const x of [30, 110]) s += shaded((a) => `<circle cx="${x}" cy="${HY + 6}" r="9" ${a}/>`, { base: skin, dark: skinDark });
  if (o.earrings) s += `<circle cx="30" cy="${HY + 17}" r="3.5" fill="${C.white}" stroke="${C.ink}" stroke-width="1.6"/><circle cx="110" cy="${HY + 17}" r="3.5" fill="${C.white}" stroke="${C.ink}" stroke-width="1.6"/>`;
  s += shaded((a) => `<circle cx="${HX}" cy="${HY}" r="${R}" ${a}/>`, { base: skin, dark: skinDark, hl: gloss(52, 62, 11, 7, -35, 0.35) });
  if (o.beard) s += o.beard();
  s += h.front;
  s += face(mood, o);
  if (o.accessory) s += o.accessory();
  if (o.hat) s += o.hat();
  return s;
}

// ---------- ტანსაცმელი და აქსესუარები ----------
const stripes = (color) => () => {
  let s = '';
  for (let y = 134; y < 180; y += 14) s += `<rect x="38" y="${y}" width="64" height="6" fill="${color}"/>`;
  return s;
};

const chefJacket = (scarf) => () =>
  `<path d="M 70 122 L 70 178" stroke="${C.chefShade}" stroke-width="3"/>` +
  [140, 154, 168].map((y) => `<circle cx="62" cy="${y}" r="2.6" fill="${C.steelDark}"/><circle cx="78" cy="${y}" r="2.6" fill="${C.steelDark}"/>`).join('') +
  `<path d="M 56 120 L 70 136 L 84 120 Z" fill="${scarf}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;

const chefHat = () =>
  shaded((a) => `<path d="M 40 40 C 26 34 30 12 46 14 C 50 0 72 -2 76 10 C 88 0 108 8 100 26 C 110 32 104 44 98 42 Z" ${a}/>`, {
    base: C.chefWhite, dark: C.chefShade, hl: gloss(50, 16, 10, 5, -20, 0.8),
  }) +
  shaded((a) => `<rect x="38" y="34" width="64" height="16" rx="5" ${a}/>`, { base: C.chefWhite, dark: C.chefShade }) +
  `<path d="M 54 36 L 54 48 M 70 36 L 70 48 M 86 36 L 86 48" stroke="${C.chefShade}" stroke-width="2.4"/>`;

const flatCap = () =>
  shaded((a) => `<path d="M 30 70 C 28 42 52 32 74 34 C 98 36 112 50 110 70 C 96 62 46 62 30 70 Z" ${a}/>`, {
    base: C.tealDark, dark: '#166E66', hl: gloss(52, 44, 12, 4, -15, 0.3),
  }) +
  shaded((a) => `<path d="M 36 68 C 54 60 92 60 114 66 C 118 72 112 76 104 74 C 86 70 56 70 40 76 C 34 76 32 72 36 68 Z" ${a}/>`, { base: '#1B7F76', dark: '#145F58' }) +
  `<circle cx="72" cy="35" r="4" fill="${C.tealDark}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;

const hardHat = () =>
  shaded((a) => `<path d="M 30 66 C 28 36 50 26 70 26 C 90 26 112 36 110 66 Z" ${a}/>`, { base: '#FFC93C', dark: '#E09400', hl: gloss(50, 38, 12, 5, -25, 0.55) }) +
  `<path d="M 70 27 L 70 64" stroke="#E09400" stroke-width="5"/>` +
  shaded((a) => `<rect x="22" y="62" width="96" height="10" rx="5" ${a}/>`, { base: '#FFC93C', dark: '#E09400' });

const headband = () =>
  shaded((a) => `<path d="M 31 66 C 44 56 96 56 109 66 L 108 76 C 94 68 46 68 32 76 Z" ${a}/>`, { base: C.counter, dark: C.counterDark }) +
  `<path d="M 40 66 C 54 61 86 61 100 66" stroke="#fff" stroke-width="2.4" fill="none"/>`;

const roundGlasses = (frame = C.ink) =>
  `<g fill="#fff" fill-opacity="0.25" stroke="${frame}" stroke-width="${SW.inner}"><circle cx="55" cy="89" r="11"/><circle cx="85" cy="89" r="11"/></g>` +
  `<path d="M 66 88 Q 70 85 74 88" fill="none" stroke="${frame}" stroke-width="${SW.inner}"/>`;

const vanoFace = () =>
  shaded((a) => `<path d="M 70 99 C 62 93 50 95 45 102 C 51 106 61 106 70 102 C 79 106 89 106 95 102 C 90 95 78 93 70 99 Z" ${a}/>`, { base: C.hairGray, dark: '#A39F9A' }) +
  roundGlasses() +
  `<path d="M 44 76 Q 55 70 64 76 M 76 76 Q 85 70 96 76" stroke="${C.hairGray}" stroke-width="5" fill="none"/>`;

const vest = (color, dark, reflect) => () => {
  let s = `<path d="M 41 129 L 56 122 L 66 178 L 43 172 Z M 99 129 L 84 122 L 74 178 L 97 172 Z" fill="${color}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
  if (reflect) s += `<path d="M 42 150 L 61 152 M 98 150 L 79 152" stroke="${reflect}" stroke-width="5"/><path d="M 42 160 L 63 162 M 98 160 L 77 162" stroke="${reflect}" stroke-width="5"/>`;
  else s += `<circle cx="70" cy="150" r="2.4" fill="${C.ink}"/><circle cx="70" cy="164" r="2.4" fill="${C.ink}"/>`;
  void dark;
  return s;
};

const cardigan = (color) => () =>
  `<path d="M 41 129 Q 41 121 47 120 L 58 120 L 64 178 L 50 178 Q 43 178 43 172 Z M 99 129 Q 99 121 93 120 L 82 120 L 76 178 L 90 178 Q 97 178 97 172 Z" fill="${color}" stroke="${C.ink}" stroke-width="${SW.inner}"/>` +
  [140, 154, 168].map((y) => `<circle cx="62" cy="${y}" r="2.2" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`).join('');

const pearls = () => {
  let s = '';
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, x = 56 + 28 * t, y = 124 + Math.sin(t * Math.PI) * 9;
    s += `<circle cx="${x}" cy="${y}" r="2.8" fill="#fff" stroke="${C.ink}" stroke-width="1.2"/>`;
  }
  return s;
};

const jersey = () =>
  `<path d="M 62 138 L 78 138 L 66 166" fill="none" stroke="#fff" stroke-width="7"/>` +
  `<path d="M 62 138 L 78 138 L 66 166" fill="none" stroke="${C.ink}" stroke-width="1.6" opacity="0.4"/>` +
  `<path d="M 56 120 Q 70 130 84 120" fill="none" stroke="#fff" stroke-width="4"/>`;

const beard = (color, dark) => () =>
  shaded((a) => `<path d="M 32 90 C 32 118 50 132 70 132 C 90 132 108 118 108 90 C 100 104 90 110 70 110 C 50 110 40 104 32 90 Z" ${a}/>`, { base: color, dark });

// ---------- მზარეულები ----------
export const CHEF_OPTIONS = {
  gender: ['girl', 'boy'],
  style: { girl: ['ponytail', 'braids'], boy: ['short', 'curly'] },
  skin: ['s1', 's2', 's3', 's4'],
  hair: ['brown', 'black', 'blonde', 'red'],
};
export const chefKey = (g, st, sk, hr) => `chef_${g}_${st}_${sk}_${hr}`;

function chefSpec(gender, style, skin, hairColor) {
  return {
    skin: SKINS[skin], hairStyle: style, hair: HAIR[hairColor],
    shirt: C.chefWhite, shirtDark: C.chefShade, pants: C.pants, pantsDark: C.pantsDark, shoe: C.shoe,
    torsoExtra: chefJacket(gender === 'girl' ? C.teal : C.counter), hat: chefHat,
  };
}

// ---------- სტუმრები ----------
export const CUSTOMERS = {
  customer_nino: {
    skin: SKINS.s2, hairStyle: 'puffs', hair: HAIR.brown,
    shirt: C.cheese, shirtDark: C.cheeseDark, pants: '#5B8DEF', pantsDark: '#3F6BC4', shoe: C.counter, shoeDark: C.counterDark,
    torsoExtra: stripes('#FFF6C9'),
  },
  customer_vano: {
    skin: SKINS.s1, hairStyle: 'tufts', hair: HAIR.gray,
    shirt: '#FFFFFF', shirtDark: '#D9E0E8', pants: '#6B5B4E', pantsDark: '#4D4038', shoe: C.shoe,
    overTorso: vest('#7A4B32'), accessory: vanoFace, hat: flatCap, hideBrows: true, mouthDy: 5,
  },
  customer_ana: {
    skin: SKINS.s1, hairStyle: 'bob', hair: HAIR.blonde,
    shirt: '#FF8A79', shirtDark: '#E2604F', sleeve: '#2FBFB1', sleeveDark: '#22968C',
    pants: '#3F4A7A', pantsDark: '#2C355C', shoe: '#7A4B32', shoeDark: '#55321F',
    overTorso: cardigan('#2FBFB1'), accessory: () => roundGlasses('#7A4B32'),
  },
  customer_dato: {
    skin: SKINS.s3, hairStyle: 'short', hair: HAIR.black,
    shirt: '#9AA5B1', shirtDark: '#76828F', pants: '#4A6FA5', pantsDark: '#34527F', shoe: '#7A4B32', shoeDark: '#55321F',
    overTorso: vest('#FF8A3D', '#D9631B', '#FFF6C9'), beard: beard(C.hairBlack, '#1A1412'), hat: hardHat,
  },
  customer_tamari: {
    skin: SKINS.s2, hairStyle: 'bun', hair: HAIR.gray,
    shirt: '#E7D3F5', shirtDark: '#C9AEE0', sleeve: '#9B6BCC', sleeveDark: '#7A4FA8',
    pants: '#7A3B52', pantsDark: '#5A2A3C', shoe: C.shoe,
    overTorso: () => cardigan('#9B6BCC')() + pearls(), earrings: true,
  },
  customer_luka: {
    skin: SKINS.s4, hairStyle: 'curly', hair: HAIR.black,
    shirt: C.lettuce, shirtDark: C.lettuceDark, pants: '#33364D', pantsDark: '#22243A', shoe: '#FFFFFF', shoeDark: '#C9D2DC',
    torsoExtra: jersey, hat: headband,
  },
};

export function buildCharacters() {
  const anchor = [70, 212];
  const { gender, style, skin, hair: hairs } = CHEF_OPTIONS;
  for (const g of gender) for (const st of style[g]) for (const sk of skin) for (const hr of hairs) {
    write(chefKey(g, st, sk, hr), CHAR_W, CHAR_H, character(chefSpec(g, st, sk, hr), 'happy'), { anchor, kind: 'chef' });
  }
  for (const [name, o] of Object.entries(CUSTOMERS)) {
    for (const mood of ['happy', 'neutral', 'angry']) {
      write(`${name}_${mood}`, CHAR_W, CHAR_H, character(o, mood), { anchor, kind: 'customer', mood });
    }
  }
}

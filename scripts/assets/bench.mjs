// სამზარეულოს მაგიდის აპარატები — წინიდან (მაგიდა თავად წინიდანაა დახატული, ამიტომ აქ იზომეტრია არ გვჭირდება).
// meta: out — სად ჩნდება მზა პროდუქტი (ჭიქა ონკანის ქვეშ, კალათა, ნაყინის ჭიქა),
//       slots — სად დევს კოტლეტები გრილზე (სურათის კოორდინატებში).
import { C, SW, write, shaded, gloss, softShadow, n } from './lib.mjs';

const rect = (x, y, w, h, r = 8) => (a) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" ${a}/>`;
const poly = (pts) => (a) => `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" ${a}/>`;

// ---------- გრილი: ზემოდან დახრილი ცხაური + წინა პანელი ღილაკებით ----------
function benchGrill(cols, fast) {
  const W = cols * 64 + 56, H = 196;
  const topY = 12, frontY = 98, inset = 16;
  let s = softShadow(W / 2, H - 6, W / 2 - 6, 9);
  // ფეხები
  for (const x of [20, W - 34]) s += shaded(rect(x, H - 26, 14, 20, 3), { base: C.steelDark, dark: C.grate, sw: SW.inner });
  // ცხაურის ზედაპირი (ზემოდან დახრილად — ტრაპეცია)
  const surf = [[inset, topY], [W - inset, topY], [W - 6, frontY], [6, frontY]];
  s += shaded(poly(surf), { base: C.grate, dark: '#26252b', off: [-2, -3] });
  // ცხაურის ღარები
  for (let i = 1; i < 8; i++) {
    const t = i / 8, y = topY + (frontY - topY) * t, x0 = inset + (6 - inset) * t, x1 = W - inset + (inset - 6) * t;
    s += `<line x1="${n(x0 + 4)}" y1="${n(y)}" x2="${n(x1 - 4)}" y2="${n(y)}" stroke="${C.grateLight}" stroke-width="2.4" opacity="0.8"/>`;
  }
  // ცხელი ცხაურის ნათება კიდეებზე
  s += `<polygon points="${surf.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="none" stroke="${fast ? '#7FD3FF' : C.flame}" stroke-width="3" opacity="0.55"/>`;
  // წინა კიდე და პანელი
  s += shaded(rect(2, frontY - 6, W - 4, 14, 5), { base: C.steelLight, dark: C.steel, sw: SW.inner + 1 });
  s += shaded(rect(4, frontY + 8, W - 8, H - frontY - 34, 10), {
    base: C.steel, dark: C.steelDark, hl: gloss(30, frontY + 22, 16, 5, 0, 0.5),
  });
  // ღილაკები
  const knobs = cols >= 4 ? 4 : 3;
  for (let i = 0; i < knobs; i++) {
    const x = (W / (knobs + 1)) * (i + 1), y = frontY + 46;
    s += shaded((a) => `<circle cx="${n(x)}" cy="${n(y)}" r="13" ${a}/>`, { base: C.tomato, dark: C.tomatoDark, sw: SW.inner + 1, off: [-2, -2] });
    s += `<line x1="${n(x)}" y1="${n(y - 9)}" x2="${n(x)}" y2="${n(y - 2)}" stroke="#fff" stroke-width="3"/>`;
  }
  if (fast) s += `<path d="M ${n(W - 34)} ${frontY + 30} l -8 14 h 8 l -4 12 l 12 -17 h -8 l 4 -9 Z" fill="#FFD43B" stroke="${C.ink}" stroke-width="2"/>`;
  // კოტლეტების ადგილები: 2 რიგი
  const slots = [];
  for (const y of [topY + 26, topY + 60]) for (let i = 0; i < cols; i++) slots.push([60 + i * 64 - (y > 50 ? 0 : 0), y]);
  return { W, H, s, slots };
}

// ---------- წვენის დისპენსერი: გამჭვირვალე ავზი, ონკანი, ჭიქის ადგილი ----------
function benchDrink(auto) {
  const W = 140, H = 224;
  let s = softShadow(W / 2, H - 6, 58, 8);
  // ქვედა კორპუსი
  s += shaded(rect(12, 112, W - 24, 100, 14), { base: C.teal, dark: C.tealDark, hl: gloss(34, 126, 14, 5, 0, 0.5) });
  // წვეთის თავსახური (ჭიქა აქ დგება)
  s += shaded(rect(26, 192, W - 52, 14, 4), { base: C.steelDark, dark: C.grate, sw: SW.inner + 1 });
  for (let x = 34; x < W - 30; x += 10) s += `<line x1="${x}" y1="195" x2="${x}" y2="203" stroke="${C.grateLight}" stroke-width="2"/>`;
  // ონკანი
  s += shaded(rect(54, 112, 32, 22, 5), { base: C.steelLight, dark: C.steel, sw: SW.inner + 1 });
  s += shaded(rect(63, 132, 14, 12, 3), { base: C.steel, dark: C.steelDark, sw: SW.inner + 1 });
  s += shaded(rect(84, 116, 22, 9, 4), { base: C.tomato, dark: C.tomatoDark, sw: SW.inner }); // ბერკეტი
  // ცარიელი ჭიქის ადგილი (მინიშნება: „აქ ჩაისხმება")
  s += `<path d="M 52 152 L 88 152 L 84 190 Q 83 193 80 193 L 60 193 Q 57 193 56 190 Z" fill="#fff" opacity="0.35" stroke="${C.ink}" stroke-width="2.4" stroke-dasharray="5 4"/>`;
  // გამჭვირვალე ავზი წვენით
  const tank = rect(20, 14, W - 40, 96, 16);
  s += tank(`fill="${C.cupWhite}" opacity="0.55"`);
  s += `<clipPath id="bdtank${auto ? 'a' : ''}">${tank('')}</clipPath><g clip-path="url(#bdtank${auto ? 'a' : ''})">`;
  s += `<path d="M 10 46 Q 40 38 70 46 Q 100 54 130 46 L 130 120 L 10 120 Z" fill="#FFB347"/>`;
  s += `<path d="M 10 60 Q 40 52 70 60 Q 100 68 130 60 L 130 120 L 10 120 Z" fill="#F08A24" opacity="0.45"/>`;
  // ფორთოხლის ნაჭერი
  s += `<circle cx="70" cy="78" r="16" fill="#FFD27A" stroke="#F08A24" stroke-width="3"/>`;
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; s += `<line x1="70" y1="78" x2="${n(70 + Math.cos(a) * 13)}" y2="${n(78 + Math.sin(a) * 13)}" stroke="#F08A24" stroke-width="2"/>`; }
  s += `</g>`;
  s += tank(`fill="none" stroke="${C.ink}" stroke-width="${SW.outline}"`);
  s += gloss(36, 34, 7, 20, 0, 0.7);
  // სახურავი
  s += shaded(rect(14, 6, W - 28, 16, 7), { base: C.tealDark, dark: '#1f6d68', sw: SW.inner + 1 });
  if (auto) {
    s += shaded((a) => `<circle cx="${W - 22}" cy="22" r="15" ${a}/>`, { base: C.success, dark: C.successDark, sw: SW.inner + 1 });
    s += `<path d="M ${W - 30} 22 a 8 8 0 1 1 3 6 M ${W - 30} 22 l -3 -5 M ${W - 30} 22 l 5 -2" fill="none" stroke="#fff" stroke-width="2.6"/>`;
  }
  return { W, H, s, out: [70, 172], spout: [70, 144] };
}

// ---------- ფრის ქვაბი: ზეთი, კალათა სახელურით ----------
function benchFryer() {
  const W = 160, H = 190;
  let s = softShadow(W / 2, H - 6, 66, 8);
  s += shaded(rect(10, 74, W - 20, 104, 12), { base: C.steel, dark: C.steelDark, hl: gloss(30, 88, 14, 5, 0, 0.5) });
  // ზეთის აბაზანა
  s += shaded(poly([[18, 60], [W - 18, 60], [W - 10, 80], [10, 80]]), { base: '#E9A800', dark: '#B87F00', off: [-1, -2], sw: SW.inner + 1 });
  for (const [x, y] of [[44, 70], [70, 66], [104, 72], [126, 67]]) s += `<circle cx="${x}" cy="${y}" r="3" fill="#FFEB8A"/>`;
  // კალათა (ბადე) + სახელური
  s += shaded(rect(38, 28, 84, 44, 6), { base: C.steelLight, dark: C.steel, sw: SW.inner + 1 });
  for (let x = 48; x < 120; x += 12) s += `<line x1="${x}" y1="30" x2="${x}" y2="70" stroke="${C.steelDark}" stroke-width="2"/>`;
  for (let y = 40; y < 70; y += 12) s += `<line x1="40" y1="${y}" x2="120" y2="${y}" stroke="${C.steelDark}" stroke-width="2"/>`;
  s += `<path d="M 122 40 L 146 22" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><path d="M 122 40 L 146 22" stroke="${C.grateLight}" stroke-width="4" stroke-linecap="round"/>`;
  // ღილაკი და ტემპერატურა
  s += shaded((a) => `<circle cx="48" cy="128" r="14" ${a}/>`, { base: C.tomato, dark: C.tomatoDark, sw: SW.inner + 1, off: [-2, -2] });
  s += shaded(rect(78, 114, 56, 26, 6), { base: '#2B1810', dark: '#1a0f0a', sw: SW.inner });
  s += `<rect x="84" y="121" width="30" height="12" rx="3" fill="${C.success}"/>`;
  return { W, H, s, out: [80, 44] };
}

// ---------- ნაყინის აპარატი: ბუნკერი, ონკანი, ბერკეტი ----------
function benchIceCream() {
  const W = 140, H = 232;
  let s = softShadow(W / 2, H - 6, 58, 8);
  s += shaded(rect(14, 40, W - 28, 150, 16), { base: C.chefWhite, dark: C.chefShade, hl: gloss(36, 60, 12, 6, 0, 0.6) });
  // ბუნკერის თავსახური (გუმბათი)
  s += shaded((a) => `<path d="M 24 44 Q 24 8 70 8 Q 116 8 116 44 Z" ${a}/>`, { base: '#FF9EB8', dark: '#E2728F' });
  // ზოლი
  s += `<rect x="16" y="92" width="${W - 32}" height="14" fill="#FF9EB8" stroke="${C.ink}" stroke-width="2.5"/>`;
  // ონკანი + ბერკეტი
  s += shaded(rect(56, 118, 28, 22, 6), { base: C.steelLight, dark: C.steel, sw: SW.inner + 1 });
  s += shaded(rect(63, 138, 14, 12, 3), { base: C.steel, dark: C.steelDark, sw: SW.inner + 1 });
  s += `<path d="M 84 124 L 112 108" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><path d="M 84 124 L 112 108" stroke="${C.tomato}" stroke-width="4" stroke-linecap="round"/>`;
  // ჭიქის ადგილი
  s += shaded(rect(28, 198, W - 56, 14, 4), { base: C.steelDark, dark: C.grate, sw: SW.inner + 1 });
  s += `<path d="M 56 158 L 84 158 L 72 192 Q 70 196 68 192 Z" fill="#fff" opacity="0.35" stroke="${C.ink}" stroke-width="2.4" stroke-dasharray="5 4"/>`;
  return { W, H, s, out: [70, 170] };
}

export function buildBench() {
  for (const [name, cols, fast] of [['bench_grill', 2, false], ['bench_grill_fast', 2, true], ['bench_grill_big', 4, false], ['bench_grill_big_fast', 4, true]]) {
    const g = benchGrill(cols, fast);
    write(name, g.W, g.H, g.s, { anchor: [g.W / 2, g.H], kind: 'bench', slots: g.slots });
  }
  for (const auto of [false, true]) {
    const d = benchDrink(auto);
    write(auto ? 'bench_drink_auto' : 'bench_drink', d.W, d.H, d.s, { anchor: [d.W / 2, d.H], kind: 'bench', out: d.out, spout: d.spout });
  }
  const f = benchFryer();
  write('bench_fryer', f.W, f.H, f.s, { anchor: [f.W / 2, f.H], kind: 'bench', out: f.out });
  const i = benchIceCream();
  write('bench_icecream', i.W, i.H, i.s, { anchor: [i.W / 2, i.H], kind: 'bench', out: i.out, spout: [70, 150] });
}

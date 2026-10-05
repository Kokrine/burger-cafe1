// კაფეს ინვენტარი: აპარატები, სალარო, მაგიდები, მუსიკა.
// ყველა იზომეტრიულია, anchor = (0,0,0) ნაკვალევის უკანა კუთხე.
import { C, SW, write, shaded, gloss, isoProj, isoBox, isoEllipse, pts, n, lari } from './lib.mjs';
import { footShadow, frontFace } from './furniture.mjs';

const NS = 'vector-effect="non-scaling-stroke"';
const ink = (w = SW.inner) => `stroke="${C.ink}" stroke-width="${w}" ${NS}`;

/** ტილო იზომეტრიული ობიექტისთვის. extraTop — ადგილი ობიექტის თავზე (მაგ. ორთქლი, აბრა). */
function canvas(w, d, h, extraTop = 12) {
  const pad = 12;
  const ox = d + pad, oy = h + extraTop + pad;
  return { pr: isoProj(ox, oy), ox, oy, W: w + d + pad * 2, H: h + extraTop + (w + d) / 2 + pad * 2 };
}

function save(name, cv, s, meta) {
  write(name, cv.W, cv.H, s, { anchor: [cv.ox, cv.oy], kind: 'station', ...meta });
}

// ---------- სასმელის აპარატი ----------
function drinkMachine(auto) {
  const w = 48, d = 40, h = 96;
  const cv = canvas(w, d, h, auto ? 20 : 8);
  const { pr } = cv;
  const body = auto ? { top: C.counterLight, left: C.counter, right: C.counterDark } : { top: C.tealLight, left: C.teal, right: C.tealDark };
  let f = `<g transform="${frontFace(pr, 0, d, h)}">`;
  if (auto) {
    f += `<rect x="6" y="8" width="36" height="22" rx="4" fill="#23313A" ${ink()}/>`;
    f += `<rect x="11" y="13" width="10" height="4" rx="2" fill="${C.happy}"/><rect x="11" y="20" width="18" height="4" rx="2" fill="${C.happy}" opacity="0.7"/>`;
    f += `<circle cx="34" cy="18" r="4" fill="${C.cheese}"/>`;
  } else {
    f += `<rect x="6" y="8" width="36" height="24" rx="5" fill="${C.paper}" ${ink()}/>`;
    f += `<path d="M 18 14 L 30 14 L 28 28 L 20 28 Z" fill="${C.counter}" ${ink(1.6)}/><path d="M 25 14 L 29 8" stroke="${C.ink}" stroke-width="2" ${NS}/>`;
  }
  f += `<circle cx="14" cy="39" r="4" fill="${C.counter}" ${ink(1.6)}/><circle cx="26" cy="39" r="4" fill="${C.cheese}" ${ink(1.6)}/>`;
  if (auto) f += `<circle cx="38" cy="39" r="4" fill="${C.happy}" ${ink(1.6)}/>`;
  f += `<rect x="8" y="48" width="32" height="34" rx="4" fill="#2B3A44" ${ink()}/>`;
  const nozzles = auto ? [14, 24, 34] : [24];
  for (const x of nozzles) f += `<rect x="${x - 3}" y="48" width="6" height="8" fill="${C.steelLight}" ${ink(1.4)}/>`;
  f += `<path d="M 17 64 L 31 64 L 29 81 L 19 81 Z" fill="#fff" ${ink(1.6)}/><rect x="17" y="69" width="14" height="5" fill="${C.counter}"/>`;
  f += `<rect x="5" y="84" width="38" height="6" rx="2" fill="${C.steelLight}" ${ink(1.6)}/>`;
  f += `<path d="M 6 4 L 20 4" stroke="#fff" stroke-width="3" opacity="0.6" ${NS}/>`;
  f += `</g>`;
  let s = footShadow(pr, w, d);
  s += isoBox(pr, { w, d, h }, body, { decorLeft: f });
  if (auto) {
    // ციმციმა ნათურა თავზე — „ავტომატური"
    s += isoBox(pr, { x: 18, y: 14, z: h, w: 12, d: 12, h: 8 }, { top: C.cheeseLight, left: C.cheese, right: C.cheeseDark }, { gloss: false, outline: SW.inner });
  }
  save(auto ? 'drink_machine_auto' : 'drink_machine', cv, s, { footprint: [w, d], height: h });
}

// ---------- ფრის ქვაბი ----------
function fryer() {
  const w = 64, d = 52, h = 54;
  const cv = canvas(w, d, h, 26);
  const { pr } = cv;
  let f = `<g transform="${frontFace(pr, 0, d, h)}">`;
  f += `<rect x="0" y="10" width="${w}" height="8" fill="${C.primary}"/>`;
  f += `<circle cx="16" cy="34" r="8" fill="${C.paper}" ${ink()}/><path d="M 16 34 L 20 29" stroke="${C.counter}" stroke-width="2.4" ${NS}/>`;
  f += `<rect x="32" y="28" width="24" height="12" rx="3" fill="${C.steelDark}" ${ink(1.6)}/>`;
  f += `</g>`;
  let s = footShadow(pr, w, d);
  s += isoBox(pr, { w, d, h }, { top: C.steelLight, left: C.steel, right: C.steelDark }, { decorLeft: f });
  const basin = [pr(8, 8, h), pr(w - 8, 8, h), pr(w - 8, d - 8, h), pr(8, d - 8, h)];
  s += `<polygon points="${pts(basin)}" fill="#C98A1E" ${ink()}/>`;
  const [bx, by] = pr(w / 2, d / 2, h);
  s += `<ellipse cx="${n(bx - 6)}" cy="${n(by - 3)}" rx="12" ry="4" fill="#E9A800" opacity="0.6"/>`;
  // კალათა კარტოფილით
  s += isoBox(pr, { x: 16, y: 14, z: h - 2, w: 30, d: 22, h: 10 }, { top: '#4A4E69', left: '#6B7090', right: '#4A4E69' }, { gloss: false, outline: SW.inner });
  for (const [x, y] of [[22, 20], [28, 18], [34, 22], [40, 19], [26, 26], [36, 28]]) {
    const [a1, a2] = pr(x, y, h + 8), [b1, b2] = pr(x + 2, y + 1, h + 20);
    s += `<line x1="${n(a1)}" y1="${n(a2)}" x2="${n(b1)}" y2="${n(b2)}" stroke="${C.ink}" stroke-width="7"/><line x1="${n(a1)}" y1="${n(a2)}" x2="${n(b1)}" y2="${n(b2)}" stroke="${C.cheese}" stroke-width="3.5"/>`;
  }
  const [hx1, hy1] = pr(30, 36, h + 6), [hx2, hy2] = pr(30, 58, h + 14);
  s += `<line x1="${n(hx1)}" y1="${n(hy1)}" x2="${n(hx2)}" y2="${n(hy2)}" stroke="${C.ink}" stroke-width="7"/><line x1="${n(hx1)}" y1="${n(hy1)}" x2="${n(hx2)}" y2="${n(hy2)}" stroke="${C.counter}" stroke-width="3.5"/>`;
  save('fryer', cv, s, { footprint: [w, d], height: h });
}

// ---------- ნაყინის აპარატი ----------
function iceCreamMachine() {
  const w = 50, d = 44, h = 86;
  const cv = canvas(w, d, h, 44);
  const { pr } = cv;
  let f = `<g transform="${frontFace(pr, 0, d, h)}">`;
  f += `<rect x="0" y="0" width="${w}" height="34" fill="#FF9EB8"/>`;
  f += `<path d="M 25 30 L 19 16 L 31 16 Z" fill="${C.bunLight}" ${ink(1.6)}/><circle cx="25" cy="13" r="6" fill="#fff" ${ink(1.6)}/>`;
  for (const x of [14, 36]) f += `<rect x="${x - 3}" y="40" width="6" height="12" fill="${C.steelLight}" ${ink(1.4)}/><rect x="${x - 2}" y="34" width="4" height="10" fill="${C.ink}"/>`;
  f += `<rect x="6" y="54" width="38" height="26" rx="4" fill="#2B3A44" ${ink()}/>`;
  f += `<path d="M 22 76 L 18 62 L 26 62 Z" fill="${C.bunLight}" ${ink(1.4)}/><circle cx="22" cy="60" r="4.5" fill="#FFD6E0" ${ink(1.4)}/>`;
  f += `<rect x="4" y="80" width="42" height="5" rx="2" fill="${C.steelLight}" ${ink(1.4)}/>`;
  f += `</g>`;
  let s = footShadow(pr, w, d);
  s += isoBox(pr, { w, d, h }, { top: '#FFE4EC', left: '#FFFFFF', right: '#E3E9F0' }, { decorLeft: f });
  // დიდი ნაყინი თავზე (აბრა)
  const [cx, cy] = pr(w / 2, d / 2, h);
  s += shaded((a) => `<path d="M ${cx - 12} ${cy - 6} L ${cx} ${cy + 10} L ${cx + 12} ${cy - 6} Z" ${a}/>`, { base: C.bunLight, dark: C.bun, sw: SW.inner + 1 });
  const scoops = [[0, -12, 13, '#FF9EB8', '#E2728F'], [-1, -26, 10, '#FFF4D2', '#E8D49A'], [0, -37, 7, '#8B4A2B', '#5C2C17']];
  for (const [dx, dy, r, b, dk] of scoops) s += shaded((a) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" ${a}/>`, { base: b, dark: dk, hl: gloss(cx + dx - r * 0.4, cy + dy - r * 0.4, r * 0.35, r * 0.2, -30, 0.6) });
  s += `<circle cx="${cx + 2}" cy="${cy - 46}" r="3.5" fill="${C.counter}" ${ink(1.6)}/>`;
  save('ice_cream_machine', cv, s, { footprint: [w, d], height: h });
}

// ---------- ქურა ქვაბებით ----------
function stovePots() {
  const w = 80, d = 52, h = 50;
  const cv = canvas(w, d, h, 40);
  const { pr } = cv;
  let f = `<g transform="${frontFace(pr, 0, d, h)}">`;
  for (const x of [18, 40, 62]) f += `<circle cx="${x}" cy="16" r="5" fill="${C.paper}" ${ink(1.6)}/>`;
  f += `<rect x="8" y="28" width="64" height="16" rx="3" fill="#23263A" ${ink(1.6)}/>`;
  f += `</g>`;
  let s = footShadow(pr, w, d);
  s += isoBox(pr, { w, d, h }, { top: '#6B7090', left: '#4A4E69', right: '#33364D' }, { decorLeft: f });
  const pot = (x, y, r, ph, base, dark) => {
    const [cx, cy] = pr(x, y, h);
    const rx = r * Math.SQRT2, ry = rx / 2;
    let p = '';
    p += `<path d="M ${n(cx - rx)} ${n(cy - ph)} L ${n(cx - rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(cy)} L ${n(cx + rx)} ${n(cy - ph)} Z" fill="${dark}"/>`;
    p += `<path d="M ${n(cx - rx + 4)} ${n(cy - ph)} L ${n(cx - rx + 4)} ${n(cy - 2)} A ${n(rx - 4)} ${n(ry - 2)} 0 0 0 ${n(cx + rx * 0.3)} ${n(cy + ry - 1)} L ${n(cx + rx * 0.3)} ${n(cy - ph)} Z" fill="${base}"/>`;
    p += `<path d="M ${n(cx - rx)} ${n(cy - ph)} L ${n(cx - rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(cy)} L ${n(cx + rx)} ${n(cy - ph)}" fill="none" stroke="${C.ink}" stroke-width="${SW.outline}"/>`;
    p += `<rect x="${n(cx - rx - 7)}" y="${n(cy - ph + 4)}" width="8" height="5" rx="2" fill="${dark}" ${ink(1.6)}/><rect x="${n(cx + rx - 1)}" y="${n(cy - ph + 4)}" width="8" height="5" rx="2" fill="${dark}" ${ink(1.6)}/>`;
    p += isoEllipse(cx, cy - ph, r + 1, `fill="${C.steelLight}" stroke="${C.ink}" stroke-width="${SW.inner}"`);
    p += isoEllipse(cx - 3, cy - ph - 1, r * 0.55, `fill="#fff" opacity="0.5"`);
    p += `<circle cx="${n(cx)}" cy="${n(cy - ph - 3)}" r="3.5" fill="${C.ink}"/>`;
    return p;
  };
  s += pot(22, 18, 14, 24, C.counter, C.counterDark);
  s += pot(58, 30, 13, 18, C.teal, C.tealDark);
  save('stove_pots', cv, s, { footprint: [w, d], height: h, steam: [pr(22, 18, h + 30).map((v, i) => n(v - (i ? cv.oy : cv.ox))), pr(58, 30, h + 24).map((v, i) => n(v - (i ? cv.oy : cv.ox)))] });
}

// ---------- სალარო ----------
function cashBox() {
  const w = 36, d = 28, h = 20;
  const cv = canvas(w, d, h, 4);
  const { pr } = cv;
  let f = `<g transform="${frontFace(pr, 0, d, h)}"><rect x="12" y="8" width="12" height="4" rx="2" fill="${C.ink}"/></g>`;
  let s = isoBox(pr, { w, d, h }, { top: C.billLight, left: C.bill, right: C.billDark }, { decorLeft: f });
  const [a, b] = [pr(10, 12, h), pr(26, 12, h)];
  s += `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${C.ink}" stroke-width="3"/>`;
  save('cash_box', cv, s, { footprint: [w, d], height: h, onCounter: true });
}

function cashRegister() {
  const w = 46, d = 38, h = 24;
  const cv = canvas(w, d, h, 30);
  const { pr } = cv;
  let f = `<g transform="${frontFace(pr, 0, d, h)}"><rect x="6" y="10" width="34" height="10" rx="2" fill="${C.steel}" ${ink(1.6)}/><rect x="19" y="13" width="8" height="3" rx="1.5" fill="${C.ink}"/></g>`;
  let s = footShadow(pr, w, d, 0.12);
  s += isoBox(pr, { w, d, h }, { top: '#E8EDF2', left: '#C3CED9', right: '#8696A7' }, { decorLeft: f });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const [kx, ky] = pr(14 + i * 9, 18 + j * 7, h);
    s += `<rect x="${n(kx - 3.5)}" y="${n(ky - 2)}" width="7" height="4" rx="1.5" fill="${j === 2 && i === 2 ? C.happy : C.paper}" stroke="${C.ink}" stroke-width="1.2"/>`;
  }
  const scr = `<g transform="${frontFace(pr, 10, 10, h + 26)}"><rect x="2" y="2" width="22" height="14" rx="2" fill="#23313A"/>${lari(13, 9, 10, C.happy, 1.6)}</g>`;
  s += isoBox(pr, { x: 10, y: 4, z: h, w: 26, d: 6, h: 26 }, { top: '#E8EDF2', left: '#C3CED9', right: '#8696A7' }, { decorLeft: scr, gloss: false });
  save('cash_register', cv, s, { footprint: [w, d], height: h, onCounter: true });
}

// ---------- მაგიდა სკამებით ----------
function tableSet() {
  const w = 96, d = 96, h = 44;
  const cv = canvas(w, d, h + 20, 4);
  const { pr } = cv;
  const chair = (x, y, back) => {
    let c = '';
    for (const [lx, ly] of [[x + 3, y + 3], [x + 23, y + 3], [x + 3, y + 23], [x + 23, y + 23]]) {
      const [a1, a2] = pr(lx, ly, 0), [b1, b2] = pr(lx, ly, 24);
      c += `<line x1="${n(a1)}" y1="${n(a2)}" x2="${n(b1)}" y2="${n(b2)}" stroke="${C.ink}" stroke-width="5"/><line x1="${n(a1)}" y1="${n(a2)}" x2="${n(b1)}" y2="${n(b2)}" stroke="${C.steelDark}" stroke-width="2"/>`;
    }
    c += isoBox(pr, { x, y, z: 24, w: 26, d: 26, h: 6 }, { top: C.counterLight, left: C.counter, right: C.counterDark }, { gloss: false });
    if (back === 'x') c += isoBox(pr, { x, y, z: 30, w: 5, d: 26, h: 28 }, { top: C.counterLight, left: C.counter, right: C.counterDark }, { gloss: false });
    if (back === 'y') c += isoBox(pr, { x, y: y + 21, z: 30, w: 26, d: 5, h: 28 }, { top: C.counterLight, left: C.counter, right: C.counterDark }, { gloss: false });
    return c;
  };
  let s = `<ellipse cx="${n(pr(48, 48)[0] + 6)}" cy="${n(pr(48, 48)[1] + 4)}" rx="60" ry="30" fill="${C.ink}" opacity="0.12"/>`;
  s += chair(4, 35, 'x');
  s += chair(35, 4, 'x');
  // მაგიდა
  const [cx, cy] = pr(48, 48, 0);
  s += isoEllipse(cx, cy, 14, `fill="${C.steelDark}" stroke="${C.ink}" stroke-width="${SW.inner}"`);
  s += `<rect x="${n(cx - 5)}" y="${n(cy - h)}" width="10" height="${h}" fill="${C.steel}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
  const [tx, ty] = pr(48, 48, h);
  const r = 30, rx = r * Math.SQRT2, ry = rx / 2;
  s += `<path d="M ${n(tx - rx)} ${n(ty)} L ${n(tx - rx)} ${n(ty + 6)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(tx + rx)} ${n(ty + 6)} L ${n(tx + rx)} ${n(ty)} Z" fill="${C.woodDark}" stroke="${C.ink}" stroke-width="${SW.outline}"/>`;
  s += shaded((a) => isoEllipse(tx, ty, r, a), { base: C.counterTop, dark: C.counterTopDark, off: [-3, -2], hl: isoEllipse(tx - 10, ty - 4, 8, `fill="#fff" opacity="0.6"`) });
  // მაგიდაზე: პატარა ვაზა
  s += `<rect x="${n(tx - 4)}" y="${n(ty - 14)}" width="8" height="12" rx="3" fill="${C.teal}" stroke="${C.ink}" stroke-width="1.8"/><circle cx="${n(tx)}" cy="${n(ty - 18)}" r="5" fill="${C.counter}" stroke="${C.ink}" stroke-width="1.8"/>`;
  s += chair(66, 52, 'y');
  save('table_set', cv, s, { footprint: [w, d], height: h, kind: 'furniture', seats: 2 });
}

// ---------- მუსიკალური ავტომატი ----------
function jukebox() {
  const w = 44, d = 36, h = 100;
  const cv = canvas(w, d, h, 26);
  const { pr } = cv;
  const rainbow = [C.counter, C.primary, C.cheese, C.lettuce, C.teal];
  let f = `<g transform="${frontFace(pr, 0, d, h)}">`;
  rainbow.forEach((col, i) => {
    const r = 20 - i * 3.5;
    f += `<path d="M ${22 - r} 34 A ${r} ${r} 0 0 1 ${22 + r} 34" fill="none" stroke="${col}" stroke-width="3.4" ${NS}/>`;
  });
  f += `<rect x="6" y="38" width="32" height="18" rx="3" fill="#23313A" ${ink(1.6)}/>`;
  for (const x of [12, 19, 26, 33]) f += `<rect x="${x - 2}" y="42" width="4" height="10" rx="1" fill="${C.cheese}"/>`;
  f += `<circle cx="22" cy="74" r="13" fill="${C.woodDark}" ${ink()}/>`;
  for (let k = -8; k <= 8; k += 4) f += `<path d="M ${22 - Math.sqrt(144 - k * k)} ${74 + k} L ${22 + Math.sqrt(144 - k * k)} ${74 + k}" stroke="${C.ink}" stroke-width="1.4" opacity="0.5" ${NS}/>`;
  f += `<rect x="18" y="91" width="8" height="3" rx="1.5" fill="${C.ink}"/>`;
  f += `</g>`;
  let s = footShadow(pr, w, d);
  s += isoBox(pr, { w, d, h }, { top: C.woodLight ?? '#F2BD84', left: C.wood, right: C.woodDark }, { decorLeft: f });
  // ნოტები თავზე
  const [nx, ny] = pr(w / 2, d / 2, h + 14);
  s += `<g transform="translate(${n(nx - 10)} ${n(ny - 16)})"><path d="M 6 18 L 6 2 L 18 0 L 18 14" fill="none" stroke="${C.ink}" stroke-width="3"/><ellipse cx="3.5" cy="18" rx="4.5" ry="3.5" fill="${C.counter}" stroke="${C.ink}" stroke-width="2"/><ellipse cx="15.5" cy="14" rx="4.5" ry="3.5" fill="${C.counter}" stroke="${C.ink}" stroke-width="2"/></g>`;
  save('jukebox', cv, s, { footprint: [w, d], height: h, kind: 'decor' });
}

export function buildEquipment() {
  drinkMachine(false);
  drinkMachine(true);
  fryer();
  iceCreamMachine();
  stovePots();
  cashBox();
  cashRegister();
  tableSet();
  jukebox();
}

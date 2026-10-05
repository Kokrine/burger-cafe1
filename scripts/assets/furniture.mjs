// ოთახი და ავეჯი იზომეტრიაში. anchor = ეკრანის წერტილი, სადაც ობიექტის
// იატაკის საწყისი კუთხე (x=0, y=0, z=0) მოდის; footprint = [w, d] ერთეულებში.
import { C, SW, tokens, write, shaded, gloss, softShadow, isoProj, isoBox, plane, pts, n, id } from './lib.mjs';

export const T = tokens.iso.tile; // 48
export const WALL_H = 220;
const WAIN = 74;

/** ობიექტის ჩრდილი იატაკზე (ნაკვალევი, წანაცვლებული სინათლის საწინააღმდეგოდ). */
export function footShadow(pr, w, d, op = 0.16) {
  const [dx, dy] = tokens.light.shadowOffset;
  return `<polygon points="${pts([pr(0, 0), pr(w, 0), pr(w, d), pr(0, d)].map(([x, y]) => [x + dx, y + dy]))}" fill="${C.ink}" opacity="${op}"/>`;
}

/** ყუთის წინა (განათებული) წახნაგის ლოკალური სისტემა: u → x-ის გასწვრივ, v → ქვემოთ ზემო კიდიდან. */
export const frontFace = (pr, x, yFront, zTop) => plane.front(pr(x, yFront, zTop));
export const sideFace = (pr, xRight, y, zTop) => plane.side(pr(xRight, y, zTop));

// ---------- იატაკი ----------
function floorTile(fill, line, pattern, alt) {
  const p = [[T, 0], [2 * T, T / 2], [T, T], [0, T / 2]];
  const P = (x, y) => [T + x - y, (x + y) / 2];
  let s = `<polygon points="${pts(p)}" fill="${fill}"/>`;
  if (pattern === 'wood') {
    for (const yy of [T / 4, T / 2, (3 * T) / 4]) s += `<polyline points="${pts([P(0, yy), P(T, yy)])}" stroke="${line}" stroke-width="1.6"/>`;
    const seams = alt ? [[14, 0], [34, 1], [8, 2], [28, 3]] : [[30, 0], [10, 1], [40, 2], [20, 3]];
    for (const [x, row] of seams) s += `<polyline points="${pts([P(x, row * (T / 4)), P(x, (row + 1) * (T / 4))])}" stroke="${line}" stroke-width="1.6"/>`;
  } else if (pattern === 'marble') {
    s += `<path d="M ${n(P(6, 30)[0])} ${n(P(6, 30)[1])} Q ${n(P(20, 18)[0])} ${n(P(20, 18)[1])} ${n(P(40, 10)[0])} ${n(P(40, 10)[1])}" fill="none" stroke="${alt ? '#565B75' : '#E3E7EE'}" stroke-width="1.6"/>`;
  }
  s += `<polyline points="${pts([[0, T / 2], [T, 0], [2 * T, T / 2]])}" fill="none" stroke="#fff" stroke-width="2" opacity="${pattern === 'marble' && alt ? 0.2 : 0.45}"/>`;
  s += `<polygon points="${pts(p)}" fill="none" stroke="${line}" stroke-width="${SW.env}"/>`;
  return s;
}

// ---------- კედლის სეგმენტი (1 ფილა × 220) ----------
function wallSegment(side, L) {
  const lit = side === 'right';
  const wall = L.wall[lit ? 0 : 1];
  const wain = L.wainscot[lit ? 0 : 1];
  const o = lit ? [2, 2] : [2, 2 + T / 2];
  const tf = lit ? plane.front(o) : plane.side(o);
  const ns = 'vector-effect="non-scaling-stroke"';
  let s = `<g transform="${tf}">`;
  s += `<rect x="0" y="0" width="${T}" height="${WALL_H}" fill="${wall}"/>`;
  if (L.wallPattern === 'stripe') s += `<rect x="${T / 2 - 6}" y="0" width="12" height="${WALL_H - WAIN}" fill="#fff" opacity="0.2"/>`;
  if (L.wallPattern === 'dots') for (let y = 30; y < WALL_H - WAIN - 10; y += 26) for (const x of (y / 26) % 2 < 1 ? [12, 36] : [24]) s += `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" opacity="0.5"/>`;
  s += `<rect x="0" y="${WALL_H - WAIN}" width="${T}" height="${WAIN}" fill="${wain}"/>`;
  if (L.wainscotPattern === 'panel') s += `<path d="M ${T / 2} ${WALL_H - WAIN + 10} L ${T / 2} ${WALL_H - 8}" stroke="#000" stroke-opacity="0.12" stroke-width="3" ${ns}/>`;
  if (L.wainscotPattern === 'brick') {
    for (let r = 0; r < 6; r++) {
      const y = WALL_H - WAIN + r * 11;
      s += `<path d="M 0 ${y} L ${T} ${y}" stroke="#fff" stroke-opacity="0.35" stroke-width="1.6" ${ns}/>`;
      for (const x of r % 2 ? [12, 36] : [0, 24, 48]) s += `<path d="M ${x} ${y} L ${x} ${y + 11}" stroke="#fff" stroke-opacity="0.35" stroke-width="1.6" ${ns}/>`;
    }
  }
  if (L.wainscotPattern === 'chrome') for (const y of [14, 30, 46]) s += `<rect x="0" y="${WALL_H - WAIN + y}" width="${T}" height="4" fill="#fff" opacity="0.55"/>`;
  s += `<rect x="0" y="${WALL_H - WAIN - 8}" width="${T}" height="10" fill="${C.rail}" stroke="${C.inkSoft}" stroke-width="${SW.env}" ${ns}/>`;
  s += `<rect x="0" y="0" width="${T}" height="12" fill="${C.rail}" stroke="${C.inkSoft}" stroke-width="${SW.env}" ${ns}/>`;
  s += `<rect x="0" y="${WALL_H - 8}" width="${T}" height="8" fill="#000" opacity="0.18"/>`;
  s += `</g>`;
  const anchor = lit ? [2, 2 + WALL_H] : [2 + T, 2 + WALL_H];
  return { w: T + 4, h: WALL_H + T / 2 + 4, s, anchor };
}

// ---------- კედლის დეკორი (მარჯვენა კედლის სიბრტყეზე) ----------
function windowRight() {
  const W = 104, H = 92, o = [8, 8];
  const g = id('g');
  const ns = 'vector-effect="non-scaling-stroke"';
  let s = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky}"/><stop offset="1" stop-color="${C.skyLight}"/></linearGradient></defs>`;
  s += `<g transform="${plane.front(o)}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW.outline}" ${ns}/>`;
  s += `<rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="4" fill="url(#${g})" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `<circle cx="74" cy="28" r="10" fill="${C.sun}"/>`;
  s += `<path d="M 18 52 q 4 -10 14 -7 q 5 -9 15 -3 q 9 -2 9 7 q 6 2 3 7 l -38 0 q -6 -1 -3 -4 z" fill="${C.cloud}"/>`;
  s += `<path d="M 9 70 Q 30 58 52 66 Q 74 56 95 66 L 95 83 L 9 83 Z" fill="${C.leaf}" opacity="0.9"/>`;
  s += `<path d="M ${W / 2} 9 L ${W / 2} ${H - 9} M 9 ${H / 2} L ${W - 9} ${H / 2}" stroke="${C.white}" stroke-width="7" ${ns}/>`;
  s += `<path d="M 14 16 L 30 16" stroke="#fff" stroke-width="4" opacity="0.8" ${ns}/>`;
  s += `</g>`;
  s += isoBox(isoProj(o[0], o[1] + H), { x: -4, y: 0, z: -2, w: W + 8, d: 12, h: 8 }, { top: C.white, left: C.white, right: C.cupShade }, { gloss: false });
  return { w: W + 30, h: H + W / 2 + 34, s, anchor: o };
}

function doorRight() {
  const W = 76, H = 150, o = [6, 6];
  const ns = 'vector-effect="non-scaling-stroke"';
  let s = `<g transform="${plane.front(o)}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="${C.white}" stroke="${C.ink}" stroke-width="${SW.outline}" ${ns}/>`;
  s += `<rect x="8" y="8" width="${W - 16}" height="${H - 8}" rx="4" fill="${C.counter}" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `<rect x="16" y="16" width="${W - 32}" height="56" rx="6" fill="${C.skyLight}" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `<path d="M 22 24 L 34 24" stroke="#fff" stroke-width="4" ${ns}/>`;
  s += `<rect x="18" y="86" width="${W - 36}" height="20" rx="5" fill="${C.cheese}" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `<circle cx="${W / 2}" cy="96" r="5" fill="${C.happy}"/>`;
  s += `<circle cx="${W - 18}" cy="118" r="5" fill="${C.steelLight}" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `</g>`;
  return { w: W + 14, h: H + W / 2 + 12, s, anchor: o };
}

function pictureRight() {
  const W = 70, H = 58, o = [6, 6];
  const ns = 'vector-effect="non-scaling-stroke"';
  let s = `<g transform="${plane.front(o)}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="${C.wood}" stroke="${C.ink}" stroke-width="${SW.outline}" ${ns}/>`;
  s += `<rect x="7" y="7" width="${W - 14}" height="${H - 14}" fill="${C.skyLight}" stroke="${C.ink}" stroke-width="${SW.inner}" ${ns}/>`;
  s += `<path d="M 20 30 Q 35 14 50 30 Z" fill="${C.bun}" stroke="${C.ink}" stroke-width="1.8" ${ns}/>`;
  s += `<rect x="19" y="30" width="32" height="5" rx="2" fill="${C.lettuce}"/><rect x="19" y="35" width="32" height="6" rx="3" fill="${C.patty}"/>`;
  s += `<rect x="20" y="41" width="30" height="5" rx="2.5" fill="${C.bun}" stroke="${C.ink}" stroke-width="1.8" ${ns}/>`;
  s += `</g>`;
  return { w: W + 12, h: H + W / 2 + 12, s, anchor: o };
}

/** ნეონის აბრა ბურგერით — „დიდი რესტორნის" (დონე 4) კედელზე. */
function neonSign() {
  const W = 120, H = 74, o = [8, 8];
  const ns = 'vector-effect="non-scaling-stroke"';
  const glow = id('n');
  const neon = (d, color) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="9" opacity="0.45" filter="url(#${glow})" ${ns}/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" ${ns}/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.8" ${ns}/>`;
  let s = `<defs><filter id="${glow}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
  s += `<g transform="${plane.front(o)}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#2A2D3E" stroke="${C.ink}" stroke-width="${SW.outline}" ${ns}/>`;
  s += `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="6" fill="none" stroke="#3B3F55" stroke-width="2" ${ns}/>`;
  s += neon('M 34 34 Q 60 6 86 34 Z', '#FFC94A');                         // ზედა ფუნთუშა
  s += neon('M 30 42 Q 45 36 60 42 Q 75 48 90 42', '#7CF27C');              // სალათა
  s += neon('M 32 50 L 88 50', '#FF6B9E');                                  // კოტლეტი
  s += neon('M 34 58 Q 60 66 86 58', '#FFC94A');                            // ქვედა ფუნთუშა
  for (const [x, y] of [[16, 16], [104, 16], [16, 58], [104, 58]]) s += `<circle cx="${x}" cy="${y}" r="3" fill="#FF6B9E"/>`;
  s += `</g>`;
  return { w: W + 16, h: H + W / 2 + 16, s, anchor: o };
}

// ---------- დახლი (სიგრძე ფილებში) ----------
function counter(tiles) {
  const len = tiles * T, d = 48, h = 70;
  const ox = d + 10, oy = h + 14;
  const pr = isoProj(ox, oy);
  let s = footShadow(pr, len, d, 0.15);
  s += isoBox(pr, { x: 3, y: 3, z: 0, w: len - 6, d: d - 6, h: 10 }, { top: C.steelLight, left: C.steel, right: C.steelDark }, { gloss: false, outline: SW.inner });
  let panels = '';
  for (let x = 12; x < len - 12; x += T) {
    const a = pr(x + 6, d - 3, 16), b = pr(x + T - 6, d - 3, 16), c2 = pr(x + T - 6, d - 3, 52), d2 = pr(x + 6, d - 3, 52);
    panels += `<polygon points="${pts([a, b, c2, d2])}" fill="${C.counterLight}" opacity="0.45" stroke="${C.counterDark}" stroke-width="2"/>`;
  }
  s += isoBox(pr, { x: 3, y: 3, z: 10, w: len - 6, d: d - 6, h: h - 20 }, { top: C.counter, left: C.counter, right: C.counterDark }, { gloss: false, decorLeft: panels });
  s += isoBox(pr, { x: -2, y: -2, z: h - 10, w: len + 4, d: d + 4, h: 10 }, { top: C.counterTop, left: C.counterTopDark, right: '#D9C29B' });
  const L1 = pr(1, d + 1, h - 13), L2 = pr(len - 1, d + 1, h - 13);
  s += `<line x1="${n(L1[0])}" y1="${n(L1[1])}" x2="${n(L2[0])}" y2="${n(L2[1])}" stroke="${C.steelLight}" stroke-width="3"/>`;
  return { w: len + d + 30, h: h + (len + d) / 2 + 30, s, anchor: [ox, oy], footprint: [len, d], height: h };
}

// ---------- გრილი (ჩვეულებრივი / სწრაფი) ----------
function grill(fast = false) {
  const w = 96, d = 72, h = 58;
  const ox = d + 10, oy = h + 16;
  const pr = isoProj(ox, oy);
  const body = fast ? { top: '#FFE1DC', left: C.counter, right: C.counterDark } : { top: C.steelLight, left: C.steel, right: C.steelDark };
  let s = footShadow(pr, w, d, 0.18);
  let knobs = '';
  for (const kx of [22, 48, 74]) {
    const [cx, cy] = pr(kx, d, 26);
    knobs += `<g transform="matrix(1 0.5 0 1 ${n(cx)} ${n(cy)})"><circle r="8" fill="${fast ? C.cheese : C.counter}" stroke="${C.ink}" stroke-width="${SW.inner}" vector-effect="non-scaling-stroke"/><rect x="-1.5" y="-7" width="3" height="7" fill="${C.white}"/></g>`;
  }
  if (fast) {
    // ელვის ნიშანი — „სწრაფი"
    knobs += `<g transform="${frontFace(pr, 80, d, 52)}"><path d="M 6 4 L 0 16 L 6 16 L 2 28 L 13 12 L 7 12 L 11 4 Z" fill="${C.cheese}" stroke="${C.ink}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></g>`;
  } else {
    const [lx, ly] = pr(88, d, 44);
    knobs += `<circle cx="${n(lx)}" cy="${n(ly)}" r="3.5" fill="${C.happy}" stroke="${C.ink}" stroke-width="1.6"/>`;
  }
  let vents = '';
  for (let i = 0; i < 4; i++) {
    const a = pr(w, 16 + i * 12, 18), b = pr(w, 16 + i * 12, 40);
    vents += `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${C.ink}" stroke-width="2.4" opacity="0.5"/>`;
  }
  s += isoBox(pr, { x: 0, y: 0, z: 0, w, d, h }, body, { decorLeft: knobs, decorRight: vents });
  const inset = 7;
  const g = [pr(inset, inset, h), pr(w - inset, inset, h), pr(w - inset, d - inset, h), pr(inset, d - inset, h)];
  s += `<polygon points="${pts(g)}" fill="${C.grate}" stroke="${C.ink}" stroke-width="${SW.inner}"/>`;
  const glow = id('gl');
  const [gx, gy] = pr(w / 2, d / 2, h);
  s += `<defs><radialGradient id="${glow}"><stop offset="0" stop-color="${C.flame}" stop-opacity="${fast ? 0.8 : 0.55}"/><stop offset="1" stop-color="${C.flame}" stop-opacity="0"/></radialGradient></defs>`;
  s += `<ellipse cx="${n(gx)}" cy="${n(gy)}" rx="56" ry="26" fill="url(#${glow})"/>`;
  for (let yy = inset + 6; yy < d - inset; yy += 9) {
    const a = pr(inset + 2, yy, h), b = pr(w - inset - 2, yy, h);
    s += `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${C.grateLight}" stroke-width="2.6"/>`;
  }
  const slots = [[26, 20], [70, 20], [26, 52], [70, 52]].map(([x, y]) => {
    const [sx, sy] = pr(x, y, h);
    return [n(sx - ox), n(sy - oy)];
  });
  return { w: w + d + 26, h: h + (w + d) / 2 + 30, s, anchor: [ox, oy], footprint: [w, d], height: h, slots };
}

// ---------- მცენარეები ----------
function leafFan(cx, cy, leaves) {
  let s = '';
  for (const [rot, len] of leaves) {
    s += `<g transform="rotate(${rot} ${cx} ${cy})">` +
      shaded((a) => `<path d="M ${cx} ${cy} C ${cx - 12} ${cy - len * 0.6} ${cx - 8} ${cy - len} ${cx} ${cy - len - 8} C ${cx + 8} ${cy - len} ${cx + 12} ${cy - len * 0.6} ${cx} ${cy} Z" ${a}/>`, { base: C.leaf, dark: C.leafDark, off: [-2.5, -2.5], sw: SW.inner + 1 }) +
      `<path d="M ${cx} ${cy - 2} L ${cx} ${cy - len}" stroke="${C.leafDark}" stroke-width="1.8"/></g>`;
  }
  return s;
}

function pot(x0, y0, w, h) {
  return (
    shaded((a) => `<path d="M ${x0 + 5} ${y0 + 8} L ${x0 + w - 5} ${y0 + 8} L ${x0 + w - 11} ${y0 + h} Q ${x0 + w - 12} ${y0 + h + 5} ${x0 + w - 17} ${y0 + h + 5} L ${x0 + 17} ${y0 + h + 5} Q ${x0 + 12} ${y0 + h + 5} ${x0 + 11} ${y0 + h} Z" ${a}/>`, { base: C.pot, dark: C.potDark, hl: gloss(x0 + 15, y0 + 20, 3, 9, -8, 0.4) }) +
    shaded((a) => `<rect x="${x0}" y="${y0}" width="${w}" height="13" rx="5" ${a}/>`, { base: C.pot, dark: C.potDark, off: [-2, -2.5], hl: gloss(x0 + 11, y0 + 3, 8, 2, 0, 0.5) })
  );
}

function plant() {
  return softShadow(42, 112, 26, 6) + leafFan(42, 66, [[-55, 30], [-25, 38], [5, 42], [35, 38], [62, 30], [-40, 26], [20, 30]]) + pot(15, 64, 54, 44);
}

function plantBig() {
  let s = softShadow(50, 172, 30, 7);
  s += `<path d="M 50 120 C 48 90 54 70 50 40" stroke="${C.ink}" stroke-width="9" fill="none"/><path d="M 50 120 C 48 90 54 70 50 40" stroke="#8E5A3A" stroke-width="5" fill="none"/>`;
  const blobs = [[50, 34, 26], [28, 58, 22], [72, 56, 22], [36, 84, 18], [66, 86, 18]];
  for (const [x, y, r] of blobs) s += shaded((a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`, { base: C.leaf, dark: C.leafDark, hl: gloss(x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.2, -30, 0.35) });
  s += pot(20, 116, 60, 50);
  return s;
}

// ---------- შეკვეთის ბუშტი ----------
function bubble() {
  const shape = (a) => `<path d="M 22 6 L 150 6 Q 166 6 166 22 L 166 98 Q 166 114 150 114 L 98 114 L 86 130 L 74 114 L 22 114 Q 6 114 6 98 L 6 22 Q 6 6 22 6 Z" ${a}/>`;
  return shaded(shape, { base: C.paper, dark: C.cupShade, off: [-3, -4] });
}

export function buildFurniture() {
  for (const [lvl, L] of Object.entries(tokens.levels)) {
    if (lvl.startsWith('$')) continue;
    const [fa, fal, fb, fbl] = L.floor;
    write(`floor_l${lvl}_a`, 2 * T, T, floorTile(fa, fal, L.floorPattern, false), { anchor: [T, 0], kind: 'tile' });
    write(`floor_l${lvl}_b`, 2 * T, T, floorTile(fb, fbl, L.floorPattern, true), { anchor: [T, 0], kind: 'tile' });
    for (const side of ['right', 'left']) {
      const seg = wallSegment(side, L);
      write(`wall_l${lvl}_${side}`, seg.w, seg.h, seg.s, { anchor: seg.anchor, kind: 'wall', height: WALL_H });
    }
  }
  const win = windowRight();
  write('window_right', win.w, win.h, win.s, { anchor: win.anchor, kind: 'wall-decor' });
  const door = doorRight();
  write('door_right', door.w, door.h, door.s, { anchor: door.anchor, kind: 'wall-decor', width: 76 });
  const pic = pictureRight();
  write('picture_right', pic.w, pic.h, pic.s, { anchor: pic.anchor, kind: 'wall-decor' });
  const neon = neonSign();
  write('neon_sign', neon.w, neon.h, neon.s, { anchor: neon.anchor, kind: 'wall-decor' });
  for (const tiles of [6, 7, 8]) {
    const c = counter(tiles);
    write(`counter_${tiles}`, c.w, c.h, c.s, { anchor: c.anchor, footprint: c.footprint, height: c.height, kind: 'furniture' });
  }
  for (const fast of [false, true]) {
    const g = grill(fast);
    write(fast ? 'grill_fast' : 'grill', g.w, g.h, g.s, { anchor: g.anchor, footprint: g.footprint, height: g.height, slots: g.slots, kind: 'station' });
  }
  write('plant', 84, 118, plant(), { anchor: [42, 112], kind: 'decor', footprint: [40, 40] });
  write('plant_big', 100, 178, plantBig(), { anchor: [50, 172], kind: 'decor', footprint: [48, 48] });
  write('bubble', 172, 136, bubble(), { anchor: [86, 130], kind: 'ui' });
}

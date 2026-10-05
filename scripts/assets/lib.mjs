// SVG ასეტების საერთო ბიბლიოთეკა.
// წესები (ყველა ასეტისთვის ერთნაირი):
//  * 1 viewBox ერთეული = 1 ლოგიკური პიქსელი თამაშში (ბაზა 1600×900), ამიტომ
//    კონტურის სისქე ყველგან ერთნაირად გამოიყურება.
//  * სინათლე ზემოდან-მარცხნიდან: ჩრდილი ქვემოთ-მარჯვნივ, ბლიკი ზემოთ-მარცხნივ.
//  * იზომეტრია 2:1 — sx = x − y, sy = (x + y)/2 − z.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/design/tokens.json'), 'utf8'));
export const C = tokens.color;
export const SW = tokens.stroke;
export const LIGHT = tokens.light;

const OUT_DIR = path.join(ROOT, 'public/assets');
const manifest = {};
let uid = 0;

export const n = (v) => Math.round(v * 10) / 10;
export const id = (p = 'i') => `${p}${++uid}`;
export const pts = (list) => list.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

/** ჩაწერს ერთ SVG ფაილს და დაამატებს მანიფესტში (ზომა + anchor წერტილი). */
export function write(name, w, h, body, meta = {}) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `stroke-linejoin="round" stroke-linecap="round">\n${body}\n</svg>\n`;
  const file = `${name}.svg`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, file), svg);
  manifest[name] = { file, w, h, anchor: meta.anchor ?? [w / 2, h / 2], ...meta };
  uid = 0;
}

export function saveManifest() {
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return Object.keys(manifest).length;
}

/** CSS ცვლადები ტოკენებიდან (src/design/tokens.css). */
export function writeTokensCss() {
  const lines = [':root {'];
  for (const [k, v] of Object.entries(C)) lines.push(`  --c-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(tokens.radius)) lines.push(`  --r-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(tokens.font.size)) lines.push(`  --fs-${k}: ${v}px;`);
  lines.push(`  --font: ${tokens.font.family};`);
  lines.push(`  --stroke: ${SW.outline}px;`);
  lines.push(`  --touch: ${tokens.ui.minTouch}px;`);
  lines.push(`  --btn-depth: ${tokens.ui.buttonDepth}px;`);
  lines.push('}');
  const header = '/* ავტომატურად გენერირებულია tokens.json-დან (npm run assets). ხელით ნუ შეცვლი. */\n';
  fs.writeFileSync(path.join(ROOT, 'src/design/tokens.css'), header + lines.join('\n') + '\n');
}
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// ---------- ძირითადი ფორმები ----------

export const inkStroke = (sw = SW.outline) => `fill="none" stroke="${C.ink}" stroke-width="${sw}"`;

/**
 * დაჩრდილული ფორმა ერთიანი სინათლით: ბაზისი მუქი ფერია, ზემოთ-მარცხნივ
 * წანაცვლებული ასლი — ძირითადი ფერი, ამიტომ ქვემოთ-მარჯვნივ რჩება მუქი კიდე.
 * shape: (attrs) => '<path ... ${attrs}/>'
 */
export function shaded(shape, { base, dark, hl = '', off = LIGHT.shadeOffset, sw = SW.outline, extra = '' }) {
  const cid = id('c');
  let s = `<clipPath id="${cid}">${shape('')}</clipPath>`;
  s += shape(`fill="${dark}"`);
  s += `<g clip-path="url(#${cid})"><g transform="translate(${off[0]} ${off[1]})">${shape(`fill="${base}"`)}</g>${extra}${hl}</g>`;
  if (sw) s += shape(inkStroke(sw));
  return s;
}

/** თეთრი ბლიკი (ზემოთ-მარცხნივ). */
export const gloss = (cx, cy, rx, ry, rot = -25, op = LIGHT.highlightOpacity) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" transform="rotate(${rot} ${n(cx)} ${n(cy)})" fill="#fff" opacity="${op}"/>`;

/** რბილი ჩრდილი იატაკზე (წანაცვლებული ქვემოთ-მარჯვნივ). */
export function softShadow(cx, cy, rx, ry) {
  const f = id('f');
  const [dx, dy] = LIGHT.shadowOffset;
  return (
    `<filter id="${f}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>` +
    `<ellipse cx="${n(cx + dx * 0.5)}" cy="${n(cy + dy * 0.3)}" rx="${n(rx)}" ry="${n(ry)}" fill="${C.ink}" opacity="${LIGHT.shadowOpacity}" filter="url(#${f})"/>`
  );
}

/** კაფსულა (ხელი/ფეხი) — მუქი კონტური + შიგთავსი. */
export function limb(x1, y1, x2, y2, w, color, dark) {
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="${w + SW.outline * 2}"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dark}" stroke-width="${w}"/>` +
    `<line x1="${x1 - 1.5}" y1="${y1 - 1.5}" x2="${x2 - 1.5}" y2="${y2 - 1.5}" stroke="${color}" stroke-width="${w - 4}"/>`
  );
}

// ---------- იზომეტრია ----------

/** პროექცია: საწყისი (ox, oy) — ეკრანის წერტილი, სადაც მოდის (0,0,0). */
export const isoProj = (ox, oy) => (x, y, z = 0) => [ox + x - y, oy + (x + y) / 2 - z];

/** სიბრტყეებზე დახატვის მატრიცები (ლოკალური u → მარჯვნივ, v → ქვემოთ). */
export const plane = {
  // y = const კედელი/წახნაგი (განათებული, იყურება +y-კენ)
  front: (o) => `matrix(1 0.5 0 1 ${n(o[0])} ${n(o[1])})`,
  // x = const კედელი/წახნაგი (ჩრდილში, იყურება +x-კენ)
  side: (o) => `matrix(1 -0.5 0 1 ${n(o[0])} ${n(o[1])})`,
  // z = const ზედაპირი
  top: (o) => `matrix(1 0.5 -1 0.5 ${n(o[0])} ${n(o[1])})`,
};

/**
 * იზომეტრიული ყუთი სამი ხილული წახნაგით.
 * colors: { top, left, right } — left = y+d წახნაგი (განათებული), right = x+w (ჩრდილი).
 */
export function isoBox(pr, { x = 0, y = 0, z = 0, w, d, h }, colors, opt = {}) {
  const { outline = SW.outline, inner = SW.inner, gloss: g = true, decorLeft = '', decorRight = '', decorTop = '' } = opt;
  const A = pr(x, y, z + h), B = pr(x + w, y, z + h), Cc = pr(x + w, y + d, z + h), D = pr(x, y + d, z + h);
  const B0 = pr(x + w, y, z), C0 = pr(x + w, y + d, z), D0 = pr(x, y + d, z);
  const face = (p, fill) => `<polygon points="${pts(p)}" fill="${fill}" stroke="${C.ink}" stroke-width="${inner}"/>`;
  let s = '';
  s += face([D, Cc, C0, D0], colors.left) + decorLeft;
  s += face([Cc, B, B0, C0], colors.right) + decorRight;
  s += face([A, B, Cc, D], colors.top) + decorTop;
  if (g) {
    const k = Math.min(5, d * 0.12, w * 0.12);
    const a = pr(x + k, y + k, z + h), dd = pr(x + k, y + d * 0.7, z + h), bb = pr(x + w * 0.7, y + k, z + h);
    s += `<polyline points="${pts([dd, a, bb])}" fill="none" stroke="#fff" stroke-width="3" opacity="0.6"/>`;
  }
  if (outline) s += `<polygon points="${pts([A, B, B0, C0, D0, D])}" fill="none" stroke="${C.ink}" stroke-width="${outline}"/>`;
  return s;
}

/** იზომეტრიული ელიფსი (წრე იატაკზე/ზედაპირზე): rx = r√2, ry = r√2/2. */
export const isoEllipse = (cx, cy, r, attrs) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * Math.SQRT2)}" ry="${n((r * Math.SQRT2) / 2)}" ${attrs}/>`;

/** ლარის ნიშანი (სტილიზებული ₾), ცენტრით (cx, cy), ზომა s. */
export function lari(cx, cy, s, color, sw = 2.6) {
  const k = s / 24;
  const P = (x, y) => `${n(cx + x * k)} ${n(cy + y * k)}`;
  return (
    `<g fill="none" stroke="${color}" stroke-width="${sw}">` +
    `<path d="M ${P(9, -2)} A ${n(9 * k)} ${n(9 * k)} 0 1 0 ${P(-6, 6)}"/>` +
    `<path d="M ${P(-2, -12)} L ${P(-2, 2)} M ${P(4, -12)} L ${P(4, 2)}"/>` +
    `<path d="M ${P(-11, 11)} L ${P(11, 11)}"/>` +
    `</g>`
  );
}

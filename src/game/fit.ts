// ოთახის მაქსიმალური ზომა ეკრანზე: ოთახი რომბია (იზომეტრია) + კედლები → ამოზნექილი ექვსკუთხედი.
// ვეძებთ უდიდეს მასშტაბს და პოზიციას, რომ ექვსკუთხედი ეკრანზე ეტეოდეს და ინტერფეისის
// ელემენტებს (HUD, ღილაკები, დავალებები) არ ეხებოდეს — ისინი ეკრანის კუთხეებშია, სადაც რომბი
// ისედაც არ წვდება. წმინდა გეომეტრია (ტესტირებადი), DOM-ის გაზომვა — ცალკე ფუნქციაში.

export type Pt = [number, number];
export interface Rect { x0: number; y0: number; x1: number; y1: number }

/** ამოზნექილი მრავალკუთხედი და მართკუთხედი იკვეთება? (გამყოფი ღერძის თეორემა) */
export function convexIntersectsRect(poly: Pt[], r: Rect): boolean {
  const rect: Pt[] = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
  const axes: Pt[] = [[1, 0], [0, 1]];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    axes.push([-(by - ay), bx - ax]);
  }
  for (const [nx, ny] of axes) {
    let pMin = Infinity, pMax = -Infinity, rMin = Infinity, rMax = -Infinity;
    for (const [x, y] of poly) { const d = x * nx + y * ny; pMin = Math.min(pMin, d); pMax = Math.max(pMax, d); }
    for (const [x, y] of rect) { const d = x * nx + y * ny; rMin = Math.min(rMin, d); rMax = Math.max(rMax, d); }
    if (pMax <= rMin || rMax <= pMin) return false;
  }
  return true;
}

export interface Fit { scale: number; center: Pt } // center — მრავალკუთხედის ცენტრის ეკრანის წერტილი

/**
 * უდიდესი მასშტაბი (ეკრანის px / world ერთეული), რომლითაც poly ეტევა bounds-ში და არ კვეთს avoid-ს.
 * poly — world კოორდინატებში; შედეგი: მასშტაბი და ეკრანზე poly-ს „ცენტრის" (bbox-ის შუა) ადგილი.
 */
export function bestFit(poly: Pt[], bounds: Rect, avoid: Rect[], maxScale: number, minScale = 0.05): Fit | null {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const pcx = (Math.min(...xs) + Math.max(...xs)) / 2, pcy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const pw = Math.max(...xs) - Math.min(...xs), ph = Math.max(...ys) - Math.min(...ys);
  const bw = bounds.x1 - bounds.x0, bh = bounds.y1 - bounds.y0;

  const tryScale = (s: number): Pt | null => {
    const hw = (pw * s) / 2, hh = (ph * s) / 2;
    // ცენტრის დასაშვები არე (bbox ეკრანში უნდა იყოს)
    const cx0 = bounds.x0 + hw, cx1 = bounds.x1 - hw, cy0 = bounds.y0 + hh, cy1 = bounds.y1 - hh;
    if (cx0 > cx1 || cy0 > cy1) return null;
    const nx = 24, ny = 14;
    const midX = (bounds.x0 + bounds.x1) / 2, midY = (bounds.y0 + bounds.y1) / 2;
    const cands: Pt[] = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
      cands.push([cx0 + ((cx1 - cx0) * i) / nx, cy0 + ((cy1 - cy0) * j) / ny]);
    }
    // ეკრანის შუასთან ახლოს მყოფი ვარიანტები — ჯერ
    cands.sort((a, b) => Math.hypot(a[0] - midX, a[1] - midY) - Math.hypot(b[0] - midX, b[1] - midY));
    for (const c of cands) {
      const sp = poly.map(([x, y]): Pt => [c[0] + (x - pcx) * s, c[1] + (y - pcy) * s]);
      if (!avoid.some((r) => convexIntersectsRect(sp, r))) return c;
    }
    return null;
  };

  let lo = minScale, hi = Math.min(maxScale, bw / pw, bh / ph);
  let best: Fit | null = null;
  const atHi = tryScale(hi);
  if (atHi) return { scale: hi, center: atHi };
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    const c = tryScale(mid);
    if (c) { best = { scale: mid, center: c }; lo = mid; } else hi = mid;
  }
  if (!best) { const c = tryScale(minScale); if (c) best = { scale: minScale, center: c }; }
  return best;
}

/** იზომეტრიული ოთახის სილუეტი: იატაკის რომბი + უკანა კედლები (ზემოთ wallH-ით). */
export function roomOutline(ox: number, oy: number, W: number, D: number, tile: number, wallH: number): Pt[] {
  const iso = (x: number, y: number): Pt => [ox + x - y, oy + (x + y) / 2];
  const B = iso(0, 0), R = iso(W * tile, 0), F = iso(W * tile, D * tile), L = iso(0, D * tile);
  return [[L[0], L[1] - wallH], [B[0], B[1] - wallH], [R[0], R[1] - wallH], R, F, L];
}

/** ინტერფეისის ელემენტები, რომლებიც ოთახს არ უნდა დაფარონ (ეკრანის px, მცირე დაშორებით). */
export function uiObstacles(selectors: string[], pad = 6): Rect[] {
  const out: Rect[] = [];
  for (const sel of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      out.push({ x0: r.left - pad, y0: r.top - pad, x1: r.right + pad, y1: r.bottom + pad });
    }
  }
  return out;
}

/** ამოზნექილი მრავალკუთხედის მოჭრა მართკუთხედით (Sutherland–Hodgman) — შედეგიც ამოზნექილია. */
export function clipToRect(poly: Pt[], r: Rect): Pt[] {
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= r.x0, (a, b) => lerpX(a, b, r.x0)],
    [(p) => p[0] <= r.x1, (a, b) => lerpX(a, b, r.x1)],
    [(p) => p[1] >= r.y0, (a, b) => lerpY(a, b, r.y0)],
    [(p) => p[1] <= r.y1, (a, b) => lerpY(a, b, r.y1)],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); }
      else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) return out;
  }
  return out;
}
const lerpX = (a: Pt, b: Pt, x: number): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
const lerpY = (a: Pt, b: Pt, y: number): Pt => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];

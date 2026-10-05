// სტილის ნიმუშის გვერდი: ცალკე SVG ფაილებისგან აწყობს იზომეტრიულ ვინიეტს
// იმავე anchor/manifest ლოგიკით, რასაც შემდეგ Phaser-ის სცენა გამოიყენებს.
import './preview.css';
import tokens from '../design/tokens.json';
import { S } from '../i18n/strings.ka';

type Entry = { file: string; w: number; h: number; anchor: [number, number]; stack?: number; slots?: [number, number][]; height?: number };
type Manifest = Record<string, Entry>;

const A = (k: string) => `${import.meta.env.BASE_URL}assets/${k}.svg`;
const P = S.preview;

async function main() {
  const manifest: Manifest = await (await fetch(`${import.meta.env.BASE_URL}assets/manifest.json`)).json();
  const app = document.getElementById('app')!;
  app.innerHTML = `
  <main>
    <h1>${S.appTitle}</h1>
    <p class="lead">${P.title} — ${P.subtitle}</p>

    <section class="card"><h2>${P.scene}</h2><div class="scene-wrap"><div class="scene" id="scene"></div></div></section>

    <section class="card"><h2>${P.characters}</h2><div class="grid auto" id="chars"></div></section>

    <section class="card"><h2>${P.food}</h2>
      <div class="row" style="align-items:flex-end;gap:28px">
        <div class="burger" id="burger"></div>
        <div class="grid auto" id="food" style="flex:1"></div>
      </div>
    </section>

    <section class="card"><h2>${P.objects}</h2><div class="grid auto" id="objects"></div></section>

    <section class="card"><h2>${P.ui}</h2>
      <div class="hud" style="margin-bottom:22px">
        <div class="pill stars"><img src="${A('star')}" alt=""><div><small>${S.hud.stars}</small>128</div></div>
        <div class="pill"><img src="${A('coin')}" alt=""><div><small>${S.hud.money}</small>145 ₾</div></div>
        <div class="pill"><img src="${A('icon_target')}" alt=""><div><small>${S.hud.goal}: 100 ₾</small><div class="bar"><i></i></div></div></div>
        <div class="pill"><img src="${A('icon_calendar')}" alt=""><div><small>${S.hud.day}</small>3</div></div>
        <div class="pill"><img src="${A('icon_clock')}" alt=""><div><small>${S.hud.time}</small>${P.hudTime}</div></div>
      </div>
      <div class="row" style="margin-bottom:28px">
        <button class="btn">${P.buttons.play}</button>
        <button class="btn teal"><img src="${A('coin')}" alt="">${P.buttons.shop}</button>
        <button class="btn green"><img src="${A('star')}" alt="">${P.buttons.report}</button>
      </div>
      <div class="row" style="align-items:flex-start;gap:40px">
        <div>
          <p class="question">${P.sampleQuestion}</p>
          <div class="change">
            <img src="${A('bill')}" alt=""><img src="${A('bill')}" alt="" style="opacity:.35">
            <img src="${A('coin')}" alt=""><img src="${A('coin')}" alt=""><img src="${A('coin')}" alt="">
            <button aria-label="+"><img src="${A('coin')}" alt="" style="opacity:.4"></button>
          </div>
          <div class="answer">8 ₾</div>
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => `<button class="btn">${k}</button>`).join('')}</div>
        </div>
        <div>
          <p class="question">5 + 3 = ?</p>
          <div class="choice">${[7, 8, 9].map((k) => `<button class="btn">${k}</button>`).join('')}</div>
        </div>
      </div>
    </section>

    <section class="card"><h2>${P.palette}</h2><div class="swatches" id="swatches"></div></section>
    <section class="card"><h2>${P.type}</h2>
      ${[900, 800, 600].map((w) => `<p style="font-weight:${w};font-size:${w === 900 ? 44 : w === 800 ? 30 : 22}px;margin:6px 0">${P.typeSample}</p>`).join('')}
    </section>
    <section class="card rules"><h2>${P.rules}</h2><ul>${P.rulesList.map((r) => `<li>${r}</li>`).join('')}</ul></section>
  </main>`;

  buildScene(manifest);
  gallery(manifest);
  swatches();
}

// ---------------- iso ვინიეტი ----------------
function buildScene(m: Manifest) {
  const scene = document.getElementById('scene')!;
  const OX = 356, OY = 248;
  const iso = (x: number, y: number, z = 0): [number, number] => [OX + x - y, OY + (x + y) / 2 - z];
  const T = tokens.iso.tile;
  const ROOM_X = 8, ROOM_Y = 7;

  const put = (key: string, [sx, sy]: [number, number], z: number, extra: Partial<CSSStyleDeclaration> = {}) => {
    const e = m[key];
    const img = document.createElement('img');
    img.src = A(key);
    img.style.left = `${sx - e.anchor[0]}px`;
    img.style.top = `${sy - e.anchor[1]}px`;
    img.style.zIndex = String(Math.round(z));
    Object.assign(img.style, extra);
    scene.appendChild(img);
    return img;
  };

  // იატაკი
  for (let i = 0; i < ROOM_X; i++) for (let j = 0; j < ROOM_Y; j++) put((i + j) % 2 ? 'floor_l1_b' : 'floor_l1_a', iso(i * T, j * T), 1);
  // კედლები
  for (let i = 0; i < ROOM_X; i++) put('wall_l1_right', iso(i * T, 0), 2);
  for (let j = 0; j < ROOM_Y; j++) put('wall_l1_left', iso(0, j * T), 2);
  put('window_right', iso(96, 0, 196), 3);
  put('window_right', iso(250, 0, 196), 3);

  // სიღრმე: ჯერ ნაკვალევის წინა კიდე (y), მერე x — გრძელი დახლისთვის სწორად მუშაობს
  const depth = (x: number, yFront: number) => 100 + Math.round(yFront * 2 + x * 0.05);

  put('plant', iso(30, 26), depth(30, 26));
  put('plant', iso(352, 28), depth(352, 28));

  // კლიენტები დახლის უკან
  const cust: [string, number, number, number][] = [
    ['customer_nino_happy', 112, 96, 0.85],
    ['customer_vano_neutral', 236, 104, 0.45],
  ];
  for (const [key, x, y, patience] of cust) {
    const p = iso(x, y);
    put(key, p, depth(x, y));
    // ბუშტი
    const bx = p[0], by = p[1] - 212;
    put('bubble', [bx, by], 900);
    const items = document.createElement('div');
    items.className = 'bubble-items';
    items.style.left = `${bx - 70}px`;
    items.style.top = `${by - 112}px`;
    items.style.zIndex = '901';
    items.innerHTML = miniBurger(m, key.includes('vano') ? ['patty', 'cheese', 'tomato', 'lettuce'] : ['patty', 'ketchup'], 0.5) +
      (key.includes('vano') ? `<img src="${A('fries')}" style="position:static;width:34px">` : `<img src="${A('drink_cola')}" style="position:static;width:30px">`);
    scene.appendChild(items);
    const bar = document.createElement('div');
    bar.className = 'patience';
    bar.style.left = `${bx - 60}px`;
    bar.style.top = `${by + 4}px`;
    bar.style.zIndex = '902';
    const col = patience > 0.6 ? tokens.color.happy : patience > 0.3 ? tokens.color.neutral : tokens.color.angry;
    bar.innerHTML = `<i style="width:${patience * 100}%;background:${col}"></i>`;
    scene.appendChild(bar);
  }

  // დახლი
  const cx = 40, cy = 152;
  put('counter_6', iso(cx, cy), depth(cx + 144, cy + 48));
  const H = m.counter_6.height ?? 70;
  // დახლზე: სასმელი და მონეტები
  put('drink_cola', iso(250, 176, H), depth(250, 200) + 2);
  put('coin', iso(300, 170, H + 6), depth(300, 200) + 3);
  put('coin', iso(312, 176, H + 4), depth(312, 200) + 3);
  const pop = document.createElement('div');
  pop.className = 'pop';
  const pp = iso(300, 172, H);
  pop.style.left = `${pp[0] - 30}px`;
  pop.style.top = `${pp[1] - 74}px`;
  pop.style.zIndex = '950';
  pop.textContent = '+12 ₾';
  scene.appendChild(pop);

  // მზარეული
  put('chef_girl_ponytail_s1_red', iso(150, 262), depth(150, 262));

  // გრილი და კოტლეტები
  const gx = 262, gy = 236;
  const gp = iso(gx, gy);
  put('grill', gp, depth(gx + 48, gy + 72));
  const slots = m.grill.slots ?? [];
  const states = ['raw', 'ready', 'burnt', 'ready'];
  slots.forEach(([sx, sy], i) => {
    const img = put(`grill_patty_${states[i]}`, [gp[0] + sx, gp[1] + sy], depth(gx + 48, gy + 72) + 1);
    void img;
  });
  // ორთქლი / კვამლი
  slots.forEach(([sx, sy], i) => {
    if (states[i] === 'raw') return;
    const puff = document.createElement('div');
    puff.className = 'steam';
    const smoke = states[i] === 'burnt';
    puff.style.cssText = `position:absolute;left:${gp[0] + sx - 10}px;top:${gp[1] + sy - 40}px;width:20px;height:26px;border-radius:50%;background:${smoke ? '#6b5f5a' : '#fff'};filter:blur(3px);z-index:${depth(gx + 48, gy + 72) + 2};animation-delay:${i * 0.5}s`;
    scene.appendChild(puff);
  });
  const lbl = (txt: string, x: number, y: number, z: number) => {
    const t = document.createElement('div');
    t.className = 'tag';
    t.textContent = txt;
    const p = iso(x, y, z);
    t.style.left = `${p[0]}px`;
    t.style.top = `${p[1]}px`;
    t.style.zIndex = '960';
    scene.appendChild(t);
  };
  lbl(`${S.grill.raw} · ${S.grill.ready} · ${S.grill.burnt}`, 372, 300, 0);

  // ბურგერი დახლზე
  const bp = iso(150, 178, H);
  const b = document.createElement('div');
  b.innerHTML = miniBurger(m, ['patty', 'cheese', 'lettuce'], 0.55);
  b.style.cssText = `position:absolute;left:${bp[0] - 36}px;top:${bp[1] - 60}px;z-index:${depth(150, 200) + 2}`;
  scene.appendChild(b);

  // ზომის მორგება
  const fit = () => {
    const wrap = scene.parentElement!;
    const k = Math.min(1, wrap.clientWidth / 760);
    scene.style.transform = `scale(${k})`;
    wrap.style.height = `${640 * k}px`;
  };
  addEventListener('resize', fit);
  fit();
}

function miniBurger(m: Manifest, middle: string[], k: number) {
  const layers = ['bun_bottom', ...middle, 'bun_top'];
  let html = `<div class="burger" style="position:static">`;
  layers.forEach((l, i) => {
    const e = m[`layer_${l}`];
    const next = i < layers.length - 1;
    // შემდეგი ფენის ქვედა კიდე ამ სურათის ზედა კიდიდან: (base − stack) + შემდეგის „ჩამოსხმა" (h − base)
    const up = next ? m[`layer_${layers[i + 1]}`] : undefined;
    const overlap = up ? (e.anchor[1] - (e.stack ?? 10) + up.h - up.anchor[1]) * k : 0;
    html += `<img src="${A(`layer_${l}`)}" style="position:static;width:${e.w * k}px;margin-top:-${overlap}px">`;
  });
  return html + '</div>';
}

// ---------------- გალერეა ----------------
function gallery(m: Manifest) {
  const tile = (key: string, label: string) => `<div class="tile"><img src="${A(key)}" alt=""><span>${label}</span></div>`;
  const chars = document.getElementById('chars')!;
  chars.innerHTML =
    tile('chef_girl_ponytail_s1_red', 'მზარეული — გოგო') + tile('chef_boy_short_s3_black', 'მზარეული — ბიჭი') +
    (['nino', 'vano', 'ana', 'dato', 'tamari', 'luka'] as const).flatMap((c) => (['happy', 'neutral', 'angry'] as const).map((md) => tile(`customer_${c}_${md}`, `${S.customers[c]} — ${S.moods[md]}`))).join('');

  const burger = document.getElementById('burger')!;
  burger.outerHTML = miniBurger(m, ['ketchup', 'patty', 'cheese', 'tomato', 'onion', 'lettuce', 'mayo'], 1).replace('class="burger"', 'class="burger" id="burger"');

  const food = document.getElementById('food')!;
  const ing = S.ingredients;
  food.innerHTML = [
    ['layer_bun_top', ing.bun], ['layer_patty', ing.patty], ['layer_cheese', ing.cheese], ['layer_tomato', ing.tomato],
    ['layer_lettuce', ing.lettuce], ['layer_onion', ing.onion], ['layer_ketchup', ing.ketchup], ['layer_mayo', ing.mayo],
    ['grill_patty_raw', `${ing.patty}: ${S.grill.raw}`], ['grill_patty_ready', `${ing.patty}: ${S.grill.ready}`], ['grill_patty_burnt', `${ing.patty}: ${S.grill.burnt}`],
    ['fries', ing.fries], ['drink_cola', ing.drink], ['coin', 'მონეტა'], ['bill', 'კუპიურა'], ['star', 'ვარსკვლავი'],
  ].map(([k, l]) => tile(k, l)).join('');

  const objects = document.getElementById('objects')!;
  objects.innerHTML = [
    ['grill', 'გრილი'], ['counter_6', 'დახლი'], ['plant', 'მცენარე'], ['window_right', 'ფანჯარა'], ['bubble', 'შეკვეთის ბუშტი'],
    ['floor_l1_a', 'იატაკი A'], ['floor_l1_b', 'იატაკი B'], ['wall_l1_right', 'კედელი (განათებული)'], ['wall_l1_left', 'კედელი (ჩრდილი)'],
    ['icon_clock', 'საათი'], ['icon_target', 'მიზანი'], ['icon_calendar', 'დღე'],
  ].map(([k, l]) => tile(k, l)).join('');
}

function swatches() {
  const el = document.getElementById('swatches')!;
  const keys = ['ink', 'primary', 'secondary', 'success', 'danger', 'counter', 'bun', 'patty', 'cheese', 'tomato', 'lettuce', 'floorA', 'floorB', 'wallLit', 'wainscotLit', 'steel', 'coin', 'star', 'bill', 'happy', 'neutral', 'angry'] as const;
  const c = tokens.color as Record<string, string>;
  el.innerHTML = keys.map((k) => `<div class="sw"><div style="background:${c[k]}"></div><span>${k}<br>${c[k]}</span></div>`).join('');
}

main();

// მაღაზია, ინვენტარი და განვითარება. ყიდვისას — მათემატიკის ამოცანა,
// შემდეგ პანელი წამით ქრება, რომ ბავშვმა ახალი ნივთი კაფეში დაინახოს.
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import { bus } from '../../core/bus';
import type { Progress } from '../../core/types';
import { CAFE_LEVELS, ITEMS, PRODUCTS, type Category, type ItemDef, type ProductId } from '../../config/economy';
import { allBuilt, applyPurchase, boughtCount, cafeStats, canBuy, itemById, itemPrice } from '../../logic/economy';
import { bump } from '../../logic/badges';
import { play } from '../../audio/sfx';
import { askPurchase } from '../mathModal';
import { button, h, img } from '../dom';
import { burstAt, go, openModal, toast } from '../layers';
import { branchIncome } from '../../logic/day';

type Tab = Exclude<Category, never> | 'inventory';
const TABS: { id: Tab; icon: string }[] = [
  { id: 'equipment', icon: 'grill' },
  { id: 'decor', icon: 'plant' },
  { id: 'menu', icon: 'icon_menu_book' },
  { id: 'expansion', icon: 'icon_level_up' },
  { id: 'inventory', icon: 'icon_box' },
];

let tab: Tab = 'equipment';
export function openShop(t0: Tab) {
  tab = t0;
  go('shop');
}

const nameOf = (id: string) => S.items[id]?.name ?? id;

export function shopScreen(): HTMLElement {
  const root = h('div', { class: 'overlay interactive', style: 'transition:opacity .35s' });
  let body: HTMLElement | null = null;

  const render = (p: Progress) => {
    if (!root.isConnected && body) { unsub(); return; }
    const scroll = body?.scrollTop ?? 0;
    body = h('div', { class: 'panel-body' }, h('div', { class: 'shop-layout' }, content(p), sidebar(p)));
    const panel = h('div', { class: 'panel tabbed' },
      h('div', { class: 'panel-head' }, img('icon_store'), h('h2', null, S.shop.title),
        h('button', { class: 'btn white round', 'aria-label': S.common.close, onClick: () => { unsub(); go('menu'); } }, '✕')),
      h('div', { class: 'tabs', role: 'tablist' }, ...TABS.map((tb) => h('button', {
        class: `tab ${tab === tb.id ? 'on' : ''}`, role: 'tab', 'aria-selected': tab === tb.id ? 'true' : 'false',
        onClick: () => { tab = tb.id; render(store.get()); body!.scrollTop = 0; },
      }, img(tb.icon), h('span', { class: 'txt-long' }, S.shop.tabs[tb.id]), h('span', { class: 'txt-short' }, S.shop.tabsShort[tb.id])))),
      body,
    );
    root.replaceChildren(panel);
    body.scrollTop = scroll;
  };

  const buy = async (it: ItemDef) => {
    const p = store.get();
    const price = itemPrice(it, p.grade);
    const done = await askPurchase(nameOf(it.id), p.money, price, p.grade);
    if (!done || !canBuy(store.get(), it).ok) return;
    const wasAll = allBuilt(store.get());
    store.update((q) => applyPurchase(q, it));
    const nowAll = !wasAll && allBuilt(store.get());
    if (nowAll) store.update((q) => bump(q, 'allBuilt'));
    const big = it.effects.level || it.effects.branch;
    play(big ? 'levelUp' : 'buy');
    if (it.effects.level) toast(t(S.shop.levelUp, { name: S.levels[it.effects.level] }), 'icon_level_up');
    else if (it.effects.branch) toast(S.shop.branchDone, 'icon_store');
    else toast(t(S.shop.bought, { item: nameOf(it.id) }), it.icon);
    // პანელი ქრება — ახალი ნივთი კაფეში ვარსკვლავებით ჩნდება
    root.style.opacity = '0';
    root.style.pointerEvents = 'none';
    bus.emit('bought', it.id);
    window.setTimeout(() => {
      if (nowAll) { unsub(); go('menu'); allCelebration(); return; }
      if (it.effects.branch) { unsub(); go('menu'); branchCelebration(); return; }
      if (it.effects.level) {
        const fresh = ITEMS.filter((x) => x.minLevel === it.effects.level && !x.starter).length;
        if (fresh) window.setTimeout(() => toast(t(S.shop.unlocked, { n: fresh }), 'icon_sparkle'), 900);
      }
      if (big) { unsub(); go('menu'); return; }
      root.style.opacity = '1';
      root.style.pointerEvents = '';
    }, 1900);
  };

  // ---------------- ბარათები ----------------
  const itemCard = (it: ItemDef, p: Progress) => {
    const have = p.owned[it.id] ?? 0;
    const chk = canBuy(p, it);
    const price = itemPrice(it, p.grade);
    let status: Node;
    if (it.starter) status = h('span', { class: 'chip ok' }, img('icon_check'), S.shop.starter);
    else if (chk.ok) status = button(S.shop.buy, () => void buy(it), 'green', 'coin');
    else if (chk.reason === 'maxed') status = h('span', { class: 'chip ok' }, img('icon_check'), it.max > 1 ? t(S.shop.ownedCount, { n: have, max: it.max }) : S.shop.owned);
    else if (chk.reason === 'level') status = h('span', { class: 'chip lock' }, img('icon_lock'), t(S.shop.lock.level, { n: chk.need! }));
    else if (chk.reason === 'requires') status = h('span', { class: 'chip lock' }, img('icon_lock'), t(S.shop.lock.requires, { item: nameOf(String(chk.need)) }));
    else if (chk.reason === 'items') status = h('span', { class: 'chip lock' }, img('icon_lock'), t(S.shop.lock.items, { n: chk.need!, have: boughtCount(p) }));
    else status = h('span', { class: 'chip lock' }, t(S.shop.lock.money, { n: price - p.money }));
    const locked = !chk.ok && chk.reason !== 'maxed' && chk.reason !== 'money' && !it.starter;
    const isNew = !it.starter && it.category !== 'expansion' && it.minLevel > 1 && it.minLevel === p.cafeLevel && have === 0;
    return h('div', { class: `item ${locked ? 'locked' : ''}` },
      have > 0 && it.max > 1 ? h('span', { class: 'count-badge' }, `×${have}`) : null,
      isNew ? h('span', { class: 'new-badge' }, S.shop.newItem) : null,
      h('div', { class: 'pic' }, img(it.icon)),
      h('h4', null, nameOf(it.id)),
      h('p', null, S.items[it.id]?.desc ?? ''),
      h('div', { class: 'row' },
        it.starter ? h('span') : h('span', { class: 'price' }, img('coin'), `${price} ${S.currency}`),
        status,
      ),
    );
  };

  const info = (text: string) => {
    const pop = h('div', { class: 'info-pop', hidden: true }, text);
    const b = h('button', { class: 'info-btn', 'aria-label': 'ⓘ', onClick: () => { pop.hidden = !pop.hidden; } }, 'i');
    return { b, pop };
  };

  const productCard = (id: ProductId, p: Progress) => {
    const def = PRODUCTS[id];
    const [price, cost] = def.prices[p.grade];
    const onMenu = p.menu.includes(id);
    const iCost = info(S.shop.info.cost), iProfit = info(S.shop.info.profit);
    let status: Node;
    if (onMenu) status = h('span', { class: 'chip ok' }, img('icon_check'), S.shop.product.onMenu);
    else {
      const src = def.unlockedBy ? itemById(def.unlockedBy) : null;
      if (src && src.category === 'menu') {
        const chk = canBuy(p, src);
        status = chk.ok
          ? h('div', { class: 'row' }, h('span', { class: 'price' }, img('coin'), `${itemPrice(src, p.grade)} ${S.currency}`), button(S.shop.buy, () => void buy(src), 'green', 'coin'))
          : h('span', { class: 'chip lock' }, img('icon_lock'),
            chk.reason === 'money' ? t(S.shop.lock.money, { n: itemPrice(src, p.grade) - p.money })
              : chk.reason === 'level' ? t(S.shop.lock.level, { n: chk.need! })
                : t(S.shop.lock.requires, { item: nameOf(String(chk.need)) }));
      } else {
        status = h('span', { class: 'chip lock' }, img('icon_lock'), t(S.shop.product.needs, { item: nameOf(def.unlockedBy ?? '') }));
      }
    }
    return h('div', { class: `item ${onMenu ? '' : 'locked'}` },
      h('div', { class: 'pic' }, img(def.icon)),
      h('h4', null, S.products[id]),
      h('div', { class: 'money-line' },
        img('coin', '', ''), S.shop.product.price, h('b', null, `${price} ${S.currency}`),
        iCost.b, S.shop.product.cost, h('b', null, `${cost} ${S.currency}`),
        iProfit.b, S.shop.product.profit, h('b', { style: 'color:var(--c-success-dark)' }, `${price - cost} ${S.currency}`),
      ),
      iCost.pop, iProfit.pop,
      status,
    );
  };

  const levelCard = (it: ItemDef, p: Progress) => {
    const lvl = it.effects.level;
    const card = itemCard(it, p);
    const pic = card.querySelector('.pic')!;
    if (lvl) pic.replaceChildren(img(`wall_l${lvl}_right`, '', ''), img(`floor_l${lvl}_b`, '', ''), img(`floor_l${lvl}_a`, '', ''));
    else pic.replaceChildren(img('icon_store'), img('icon_store'));
    (pic as HTMLElement).style.cssText = 'display:flex;align-items:flex-end;justify-content:center;gap:0';
    if (it.minItems && !(p.owned[it.id] > 0)) {
      const have = Math.min(boughtCount(p), it.minItems);
      card.insertBefore(h('div', null,
        h('div', { class: 'bar-lg' }, h('i', { style: `width:${(have / it.minItems) * 100}%` })),
        h('p', { class: 'hint', style: 'margin:4px 0 0' }, t(S.shop.levelNeeds, { have, need: it.minItems, price: itemPrice(it, p.grade) })),
      ), card.querySelector('.row'));
    }
    return card;
  };

  /** განვითარების გზა: დონე 1 → 2 → 3 → 4 → მეორე ფილიალი. */
  const roadmap = (p: Progress): HTMLElement => {
    const steps = ITEMS.filter((i) => i.category === 'expansion');
    const stops: HTMLElement[] = [];
    // დონე 1 — საწყისი
    const levelPic = (lvl: number) => h('div', { class: 'stop-pic' }, img(`wall_l${lvl}_right`), img(`floor_l${lvl}_b`), img(`floor_l${lvl}_a`));
    const roomInfo = (lvl: 1 | 2 | 3 | 4) => {
      const c = CAFE_LEVELS[lvl];
      return h('p', { class: 'hint' }, t(S.shop.road.room, { w: c.room[0], d: c.room[1], s: c.spots }));
    };
    const here = () => h('span', { class: 'chip ok here' }, img('icon_chef_hat'), S.shop.road.here);
    stops.push(h('div', { class: `stop ${p.cafeLevel === 1 && p.branches === 1 ? 'current' : 'done'}` },
      levelPic(1), h('h4', null, `1 · ${S.levels[1]}`), roomInfo(1),
      p.cafeLevel === 1 ? here() : h('span', { class: 'chip ok' }, img('icon_check'), S.shop.road.done)));
    let nextShown = false;
    for (const it of steps) {
      const lvl = it.effects.level as 1 | 2 | 3 | 4 | undefined;
      const owned = (p.owned[it.id] ?? 0) > 0;
      const isCurrent = owned && (lvl ? p.cafeLevel === lvl && p.branches === 1 : true);
      const isNext = !owned && !nextShown;
      if (isNext) nextShown = true;
      const state = isCurrent ? 'current' : owned ? 'done' : isNext ? 'next' : 'later';
      const card = levelCard(it, p);
      const row = card.querySelector('.row');
      const stop = h('div', { class: `stop ${state}` },
        lvl ? levelPic(lvl) : h('div', { class: 'stop-pic' }, img('icon_store'), img('icon_store')),
        h('h4', null, lvl ? `${lvl} · ${S.levels[lvl]}` : S.levels.branch),
        lvl ? roomInfo(lvl) : h('p', { class: 'hint' }, t(S.shop.road.branchInfo, { n: branchIncome({ branches: 2, grade: p.grade }) })),
        h('p', null, S.items[it.id]?.desc ?? ''),
      );
      if (isCurrent) stop.append(here());
      else if (owned) stop.append(h('span', { class: 'chip ok' }, img('icon_check'), S.shop.road.done));
      else {
        const bar = card.querySelector('.bar-lg')?.parentElement;
        if (bar && isNext) stop.append(bar);
        if (row && isNext) stop.append(row);
        if (!isNext) stop.append(h('span', { class: 'chip' }, img('icon_lock'), S.shop.road.later));
      }
      stops.push(stop);
    }
    return h('div', null, h('h3', { class: 'road-title' }, img('icon_level_up'), S.shop.road.title),
      h('div', { class: 'roadmap' }, ...stops.flatMap((st, i) => (i ? [h('div', { class: 'road-link' }), st] : [st]))));
  };

  /** მეორე ფილიალის გახსნის ზეიმი. */
  const branchCelebration = () => {
    const n = branchIncome({ branches: 2, grade: store.get().grade });
    let close = () => {};
    const title = h('h2', null, S.shop.branchTitle);
    close = openModal(h('div', { class: 'panel modal bounce-in' },
      h('div', { class: 'panel-head' }, img('icon_store'), title),
      h('div', { class: 'panel-body', style: 'display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center' },
        h('div', { class: 'branch-pics' }, img('icon_store'), img('icon_sparkle'), img('icon_store')),
        h('p', { class: 'question' }, t(S.shop.branchText, { n })),
        button(S.common.continue, () => close(), 'green big'),
      ),
    ));
    window.setTimeout(() => burstAt(title, 16), 200);
  };

  /** ყველაფერი აშენდა — დიდი ზეიმი და შედეგები. */
  const allCelebration = () => {
    const p = store.get();
    const profit = p.history.reduce((a, d) => a + d.profit, 0);
    let close = () => {};
    const title = h('h2', null, S.shop.allTitle);
    close = openModal(h('div', { class: 'panel modal bounce-in' },
      h('div', { class: 'panel-head' }, img('icon_level_up'), title),
      h('div', { class: 'panel-body', style: 'display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center' },
        h('div', { class: 'branch-pics' }, img('badge_gold'), img('icon_store'), img('badge_gold')),
        h('p', { class: 'question' }, t(S.shop.allText, { days: p.history.length, profit, stars: p.stars })),
        button(S.common.continue, () => close(), 'green big'),
      ),
    ));
    window.setTimeout(() => { burstAt(title, 24); window.setTimeout(() => burstAt(title, 18), 500); }, 200);
  };

  const content = (p: Progress): HTMLElement => {
    if (tab === 'menu') {
      return h('div', { class: 'grid-items' }, ...(Object.keys(PRODUCTS) as ProductId[]).map((id) => productCard(id, p)));
    }
    if (tab === 'expansion') return roadmap(p);
    if (tab === 'inventory') {
      const owned = ITEMS.filter((i) => (p.owned[i.id] ?? 0) > 0 && i.category !== 'expansion' && i.category !== 'menu');
      return h('div', { class: 'grid-items' }, ...owned.map((it) => {
        const c = h('div', { class: 'item' },
          (p.owned[it.id] ?? 0) > 1 ? h('span', { class: 'count-badge' }, `×${p.owned[it.id]}`) : null,
          h('div', { class: 'pic' }, img(it.icon)),
          h('h4', null, nameOf(it.id)),
          h('p', null, S.items[it.id]?.desc ?? ''),
        );
        return c;
      }));
    }
    const list = ITEMS.filter((i) => i.category === tab && !(i.starter && tab === 'decor'));
    // ჯერ ის, რისი ყიდვაც ახლა შეიძლება, მერე დანარჩენი
    const rank = (it: ItemDef) => (it.starter ? 3 : canBuy(p, it).ok ? 0 : (canBuy(p, it) as { reason: string }).reason === 'money' ? 1 : (canBuy(p, it) as { reason: string }).reason === 'maxed' ? 4 : 2);
    return h('div', { class: 'grid-items' }, ...list.sort((a, b) => rank(a) - rank(b)).map((it) => itemCard(it, p)));
  };

  const sidebar = (p: Progress): HTMLElement => {
    const s = cafeStats(p);
    const iPat = info(S.shop.info.patience);
    const next = ITEMS.find((i) => i.category === 'expansion' && !(p.owned[i.id] > 0));
    const stat = (icon: string, label: string, value: string | number, extra?: Node) =>
      h('div', { class: 'stat' }, img(icon), label, extra ?? null, h('b', null, value));
    return h('div', { class: 'side' },
      h('div', { class: 'card' },
        h('h3', null, S.shop.stats),
        stat('grill', S.shop.statLabels.grill, s.grillSlots),
        stat('icon_bolt', S.shop.statLabels.speed, `×${s.cookSpeed}`),
        stat('icon_heart', S.shop.statLabels.patience, `${Math.round(s.patience * 100)}%`, iPat.b),
        iPat.pop,
        stat('icon_people', S.shop.statLabels.customers, s.customersPerDay),
        stat('icon_menu_book', S.shop.statLabels.menu, s.menu.length),
      ),
      next ? h('div', { class: 'card' },
        h('h3', null, t(S.shop.levelProgress, { name: next.effects.level ? S.levels[next.effects.level] : S.levels.branch })),
        h('div', { class: 'bar-lg' }, h('i', { style: `width:${Math.min(100, (boughtCount(p) / (next.minItems ?? 1)) * 100)}%` })),
        h('p', { class: 'hint' }, t(S.shop.levelNeeds, { have: Math.min(boughtCount(p), next.minItems ?? 0), need: next.minItems ?? 0, price: itemPrice(next, p.grade) })),
        button(S.shop.tabs.expansion, () => { tab = 'expansion'; render(store.get()); }, 'teal', 'icon_level_up'),
      ) : null,
    );
  };

  const unsub = store.subscribe(render);
  render(store.get());
  return root;
}

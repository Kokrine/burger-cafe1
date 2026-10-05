// დილის საწყობი: მარაგის შემოწმება და ინგრედიენტების ყიდვა.
// მათემატიკა: „4 შეკვრა × 3 ₾ = ?" და „ბიუჯეტი 50 ₾, დახარჯე 32 ₾ — რამდენი დაგრჩა?"
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import { SIDE_STOCK, STOCK, type StockId } from '../../config/economy';
import { avgSideQty, buyPacks, cartCost, dayCustomers, daySideChance, eventOf, forecast, neededStock, supplierAid, type Cart } from '../../logic/day';
import { budgetProblem, gradeMax, packsProblem } from '../../logic/math/generator';
import { play } from '../../audio/sfx';
import { askProblem } from '../mathModal';
import { makeFeasibleOrder } from '../../logic/orders';
import { both, button, h, img } from '../dom';
import { go, toast } from '../layers';
import { showScene } from '../../game/game';

export function warehouseScreen(): HTMLElement {
  const root = h('div', { class: 'overlay interactive' });
  let cart: Cart = {};
  let body: HTMLElement | null = null;

  const render = () => {
    const p = store.get();
    const today = p.today!;
    const customers = dayCustomers(p);
    const ev = eventOf(today);
    const fc = forecast(p.menu, customers, avgSideQty(p), daySideChance(today.event));
    const ids = neededStock(p.menu);
    const packs = Object.values(cart).reduce((a, b) => a + (b ?? 0), 0);
    const cost = cartCost(cart, p.grade);
    const scroll = body?.scrollTop ?? 0;

    const card = (id: StockId) => {
      const def = STOCK[id];
      const have = p.stock[id] ?? 0;
      const need = fc[id];
      const n = cart[id] ?? 0;
      const set = (v: number) => {
        cart = { ...cart, [id]: Math.max(0, Math.min(9, v)) };
        play('click');
        render();
      };
      const wasOut = (p.lastStockouts ?? []).includes(id);
      return h('div', { class: `item stock-card ${have < need ? 'short' : ''}` },
        n ? h('span', { class: 'count-badge' }, `+${n}`) : '',
        wasOut ? h('span', { class: 'new-badge' }, S.service.stockout.soldOut) : '',
        h('div', { class: 'pic' }, img(def.icon)),
        h('h4', null, S.stock[id]),
        h('div', { class: 'row' },
          h('span', { class: `chip ${have < need ? 'lock' : 'ok'}` }, t(S.warehouse.inStock, { n: have })),
          h('span', { class: 'chip' }, t(S.warehouse.need, { n: need })),
        ),
        h('p', null, both(S.warehouse.pack, S.warehouse.packShort, { size: def.pack, price: def.price[p.grade] })),
        h('div', { class: 'stepper' },
          h('button', { class: 'btn white', 'aria-label': '−', onClick: () => set(n - 1), disabled: n === 0 }, '−'),
          h('b', null, `${n}`, h('span', { class: 'unit' }, ` ${S.warehouse.packs}`)),
          h('button', { class: 'btn teal', 'aria-label': '+', onClick: () => set(n + 1), disabled: n >= 9 }, '+'),
        ),
      );
    };

    const tooMuch = cost > p.money;
    body = h('div', { class: 'panel-body' },
      h('div', { class: 'info-strip wh-info' },
        ev && today.event ? h('span', { class: 'chip event' }, img(ev.icon), h('b', null, S.events[today.event].title), ' ', S.events[today.event].text) : '',
        h('span', { class: 'chip' }, img('icon_people'), both(S.warehouse.intro, S.warehouse.introShort, { n: customers })),
        h('span', { class: 'chip ok' }, img('icon_target'), both(S.warehouse.goal, S.warehouse.goalShort, { n: today.goal })),
        h('span', { class: 'chip' }, img('icon_store'), both(S.warehouse.rent, S.warehouse.rentShort, { n: today.rent })),
        p.lastStockouts?.length ? h('span', { class: 'chip lock' }, img('icon_box'), both(S.warehouse.yesterday, S.warehouse.yesterdayShort, { names: p.lastStockouts.map((x) => S.stock[x]).join(', ') })) : '',
      ),
      h('div', { class: 'grid-items' }, ...ids.map(card)),
    );
    const footer = h('div', { class: 'panel-foot' },
      h('span', { class: 'chip' }, img('icon_box'), packs ? t(S.warehouse.cartCount, { n: packs }) : S.warehouse.cartEmpty),
      tooMuch ? h('span', { class: 'chip lock' }, S.warehouse.noMoney) : '',
      h('span', { style: 'flex:1' }),
      button(S.warehouse.buy, () => void buy(), 'green', 'coin'),
      button(S.warehouse.open, open, 'big', 'menu_burger'),
    );
    const buyBtn = footer.querySelectorAll('button')[0] as HTMLButtonElement;
    buyBtn.disabled = !packs || tooMuch;

    root.replaceChildren(h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, img('icon_box'), h('h2', null, t(S.warehouse.title, { n: p.day })),
        // ტელეფონზე (დაბალი ეკრანი) მოკლე ინფო სათაურის ზოლშია — ბარათებს მეტი სიმაღლე რჩება
        h('div', { class: 'head-info' },
          ev && today.event ? h('span', { class: 'chip event' }, img(ev.icon), S.events[today.event].title) : '',
          h('span', { class: 'chip' }, img('icon_people'), t(S.warehouse.introShort, { n: customers })),
          h('span', { class: 'chip ok' }, img('icon_target'), t(S.warehouse.goalShort, { n: today.goal })),
          h('span', { class: 'chip' }, img('icon_store'), t(S.warehouse.rentShort, { n: today.rent })),
          p.lastStockouts?.length ? h('span', { class: 'chip lock' }, img('icon_box'), t(S.warehouse.yesterdayShort, { names: p.lastStockouts.map((x) => S.stock[x]).join(', ') })) : '',
        ),
        h('button', { class: 'btn white round', 'aria-label': S.common.close, onClick: () => go('menu') }, '✕')),
      body,
      footer,
    ));
    body.scrollTop = scroll;
  };

  const buy = async () => {
    const p = store.get();
    const lines = (Object.entries(cart) as [StockId, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!lines.length) return;
    const cost = cartCost(cart, p.grade);
    // 1) შეკვრების ფასი (ყველაზე დიდი ხაზი)
    const [bigId, bigN] = lines[0];
    const bigPrice = STOCK[bigId].price[p.grade];
    if (bigN >= 2 && bigN * bigPrice <= gradeMax(p.grade) && (p.grade > 1 || bigN <= 3)) {
      await askProblem(S.warehouse.budget, packsProblem(bigN, STOCK[bigId].price[p.grade], S.stock[bigId], p.grade), { cancellable: false });
    }
    // 2) ბიუჯეტი: რამდენი დაგრჩა (თუ რიცხვები კლასის ფარგლებშია)
    if (p.money <= gradeMax(p.grade)) {
      await askProblem(S.warehouse.budget, budgetProblem(p.money, cost, p.grade), { cancellable: false });
    }
    store.update((q) => { buyPacks(q, cart); });
    cart = {};
    play('buy');
    toast(S.warehouse.bought, 'icon_box');
    render();
  };

  const open = () => {
    const p = store.get();
    if (!(p.stock.bun > 0) || !(p.stock.patty > 0)) {
      toast(S.warehouse.empty, 'layer_patty');
      play('wrong');
      return;
    }
    // ვერცერთ ბურგერს ვერ გააკეთებ (მაგ. სოუსი არ არის) — სთხოვე, რომ იყიდოს
    if (!makeFeasibleOrder(p.menu, (id) => p.stock[id as StockId] ?? 0)) {
      const sideStock = new Set<string>(Object.values(SIDE_STOCK));
      const miss = neededStock(p.menu).filter((id) => !(p.stock[id] > 0) && !sideStock.has(id));
      toast(t(S.warehouse.noBurger, { names: miss.map((id) => S.stock[id]).join(', ') }), 'icon_box');
      play('wrong');
      return;
    }
    const fc = forecast(p.menu, dayCustomers(p), avgSideQty(p), daySideChance(p.today?.event));
    if (neededStock(p.menu).some((id) => (p.stock[id] ?? 0) < fc[id])) toast(S.warehouse.low, 'icon_box');
    go('service');
    showScene('service');
  };

  // ფულიც აღარ არის და ბურგერსაც ვერ აკეთებ — მომწოდებელი უფასოდ გეხმარება (თამაში არ ჩაიჭედება)
  let aid: StockId[] = [];
  store.update((q) => { aid = supplierAid(q); });
  render();
  if (aid.length) {
    toast(t(S.warehouse.aid, { names: aid.map((id) => S.stock[id]).join(', ') }), 'icon_box');
    play('buy');
  }
  return root;
}

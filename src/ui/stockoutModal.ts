// მარაგი ამოიწურა დღის განმავლობაში — ბავშვი ირჩევს: სასწრაფო მიწოდება (ძვირი),
// ან კაფეს ადრე დაკეტვა.
import { S, t } from '../i18n/strings.ka';
import type { Grade } from '../core/types';
import { STOCK, type StockId } from '../config/economy';
import { EMERGENCY } from '../config/service';
import { emergencyPrice } from '../logic/day';
import { packsProblem } from '../logic/math/generator';
import { play } from '../audio/sfx';
import { askProblem } from './mathModal';
import { button, h, img } from './dom';
import { openModal } from './layers';

export type StockoutChoice = { action: 'deliver'; packs: number } | { action: 'close' };

export function askStockout(id: StockId, grade: Grade, money: number): Promise<StockoutChoice> {
  return new Promise((resolve) => {
    const O = S.service.stockout;
    const name = S.stock[id];
    const now = emergencyPrice(id, grade);
    const morning = STOCK[id].price[grade];
    let close = () => {};
    play('wrong');

    const finish = (c: StockoutChoice) => { close(); resolve(c); };

    const packBtns = Array.from({ length: EMERGENCY.maxPacks }, (_, i) => i + 1)
      .filter((n) => n * now <= money)
      .map((n) => button(t(O.packs, { n, cost: n * now }), async () => {
        close();
        await askProblem(O.mathTitle, packsProblem(n, now, name, grade), { cancellable: false });
        resolve({ action: 'deliver', packs: n });
      }, 'green', 'icon_box'));

    const option = (icon: string, title: string, text: string, ...actions: Node[]) =>
      h('section', { class: 'card choice-card' }, h('h3', null, img(icon), title), h('p', null, text), h('div', { class: 'row' }, ...actions));

    close = openModal(h('div', { class: 'panel modal bounce-in stockout' },
      h('div', { class: 'panel-head' }, img(STOCK[id].icon), h('h2', null, t(O.title, { name }))),
      h('div', { class: 'panel-body stockout-body' },
        h('p', { class: 'question' }, t(O.text, { name })),
        option('icon_clock', O.deliver, t(O.deliverText, { s: EMERGENCY.deliverySeconds, now, morning }),
          ...(packBtns.length ? packBtns : [h('span', { class: 'chip lock' }, O.noMoney)])),
        option('icon_store', O.close, O.closeText, button(O.close, () => finish({ action: 'close' }), packBtns.length ? 'white' : 'red', 'icon_store')),
      ),
    ));
  });
}

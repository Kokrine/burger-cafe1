// მთავარი მენიუ — კაფე ჩანს ფონზე (Phaser), ქვემოთ დიდი ღილაკები.
import { S, t } from '../../i18n/strings.ka';
import { branchIncome } from '../../logic/day';
import { cafeTitle } from '../cafeName';
import { studentName } from '../../core/auth';
import { store } from '../../core/store';
import { button, h, img } from '../dom';
import { go } from '../layers';
import { startDay } from './service';
import { questList, todaysQuests } from '../quests';
import { openShop } from './shop';

const DEV = new URLSearchParams(location.search).has('dev');

export function menuScreen(): HTMLElement {
  const p = store.get();
  const levelName = p.branches > 1 ? `${S.levels[p.cafeLevel]} · ${S.levels.branch}` : S.levels[p.cafeLevel];

  const title = h('div', { class: 'card title-card', style: 'position:absolute;left:12px;top:84px' },
    h('h1', null, cafeTitle(p)),
    studentName() ? h('div', { class: 'level-chip name' }, img('icon_chef_hat'), studentName()) : '',
    h('div', { class: 'level-chip' }, img('icon_level_up'), `${S.hud.level} ${p.cafeLevel} · ${levelName}`),
    p.branches > 1 ? h('div', { class: 'level-chip branch' }, img('icon_store'), t(S.menu.network, { n: branchIncome(p) })) : '',
  );

  const play = button(S.menu.play, startDay, 'green big', 'menu_burger');

  const bar = h('div', { class: 'menu-bar' },
    play,
    button(S.menu.shop, () => openShop('equipment'), 'big', 'icon_store'),
    button(S.menu.inventory, () => openShop('inventory'), 'teal big', 'icon_box'),
    button(S.menu.profile, () => go('profile'), 'white big', 'star'),
    button(S.menu.character, () => go('character'), 'white big', 'icon_chef_hat'),
    DEV ? button(S.menu.devMoney, () => store.update((q) => { q.money += 100; }), 'red') : null,
  );

  const quests = todaysQuests(p).quests.length ? questList(p, 'menu-quests') : '';
  return h('div', { class: 'interactive' }, title, bar, quests);
}

// დღის დავალებების სია (მენიუ, ანგარიში): ტექსტი, პროგრესის ზოლი, ჯილდო.
import { S, t } from '../i18n/strings.ka';
import type { Progress } from '../core/types';
import { pickQuests, questValue, type Quest } from '../logic/quests';
import { h, img } from './dom';
import { bus } from '../core/bus';

export function questText(q: Quest): string {
  return t(S.quests[q.id], { n: q.target, product: q.product ? S.products[q.product] ?? q.product : '' });
}

export function rewardText(q: Quest): string {
  return q.reward.money ? t(S.quests.rewardMoney, { n: q.reward.money }) : t(S.quests.rewardStars, { n: q.reward.stars ?? 0 });
}

/** დღევანდელი დავალებები; თუ დღე ჯერ არ დაწყებულა — წინასწარი ნახვა (იგივე დავალებები). */
export function todaysQuests(p: Progress): { quests: Quest[]; values: number[] } {
  const t0 = p.today && p.today.day === p.day ? p.today : null;
  // განახლებამდე დასრულებულ დღეს დავალებები არ ჰქონდა — არაფერს ვაჩვენებთ
  const quests = t0 ? t0.quests ?? (t0.played ? [] : pickQuests(p)) : pickQuests(p);
  return { quests, values: quests.map((q) => (t0 ? Math.min(q.target, questValue(q, t0)) : 0)) };
}

export function questList(p: Progress, cls = ''): HTMLElement {
  const { quests, values } = todaysQuests(p);
  const doneN = quests.filter((q) => q.done).length;
  // სათაურზე დაჭერა: ტელეფონზე ბარათი იკეცება/იშლება (CSS), რომ კაფე არ დაფაროს
  const box = h('div', { class: `quests ${cls}` });
  const head = h('h3', { role: 'button', tabindex: '0', onClick: () => { box.classList.toggle('open'); bus.emit('layout'); } },
    img('icon_target'), S.quests.title, h('span', { class: 'quest-count' }, `${doneN}/${quests.length}`));
  box.append(head, ...quests.map((q, i) => h('div', { class: `quest ${q.done ? 'done' : ''} ${q.kind}` },
      h('p', null, q.done ? img('icon_check') : '', questText(q)),
      h('div', { class: 'quest-row' },
        h('div', { class: 'bar-lg small' }, h('i', { style: `width:${(values[i] / q.target) * 100}%` })),
        h('small', null, `${values[i]}/${q.target}`),
        h('span', { class: `chip ${q.kind === 'math' ? 'ok' : ''}` }, img(q.kind === 'math' ? 'star' : 'coin'), q.kind === 'math' ? `+${q.reward.stars}` : rewardText(q)),
      ),
    )));
  return box;
}

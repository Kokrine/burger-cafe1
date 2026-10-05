// პაუზის მენიუ (ხელმისაწვდომია ყველა ეკრანიდან).
import { S } from '../i18n/strings.ka';
import { store, newProgress } from '../core/store';
import type { Grade } from '../core/types';
import { bus } from '../core/bus';
import { button, h, img } from './dom';
import { go, openModal } from './layers';
import { isGuest, signOut } from '../core/auth';
import { t } from '../i18n/strings.ka';
import { showScene } from '../game/game';

const P = S.pause;

export function openPause() {
  bus.emit('pause', true);
  let close = () => {};
  const done = () => {
    close();
    bus.emit('pause', false);
  };
  const p = store.get();
  const gradeRow = h('div', { class: 'opts', style: 'justify-content:center' },
    ...([1, 2, 3, 4] as Grade[]).map((g) => h('button', {
      class: `opt grade ${p.grade === g ? 'on' : ''}`,
      onClick: () => {
        store.update((q) => { q.grade = g; });
        done();
        openPause();
      },
    }, g)),
  );
  const body = h('div', { class: 'panel-body' },
    h('div', { class: 'pause-list' },
      button(P.resume, done, 'green big'),
      button(p.settings.sound ? S.hud.soundOn : S.hud.soundOff, () => {
        store.update((q) => { q.settings.sound = !q.settings.sound; });
        done();
        openPause();
      }, 'white', p.settings.sound ? 'icon_sound_on' : 'icon_sound_off'),
      h('h3', { style: 'margin:6px 0 0;text-align:center' }, P.grade),
      isGuest() ? gradeRow : h('p', { class: 'hint', style: 'text-align:center' }, t(P.gradeFromTeacher, { n: p.grade })),
      button(P.logout, async () => { done(); showScene('cafe'); await signOut(); go('login'); }, 'white', 'icon_chef_hat'),
      !isGuest() ? '' : button(P.reset, () => {
        if (window.confirm(P.resetConfirm)) {
          showScene('cafe'); // სამუშაო დღე ჩერდება, სანამ პროგრესი თავიდან იწყება
          store.replace(newProgress(store.get().grade));
          done();
          go('character');
        }
      }, 'red'),
    ),
  );
  const panel = h('div', { class: 'panel modal bounce-in' },
    h('div', { class: 'panel-head' }, img('icon_pause'), h('h2', null, P.title)),
    body,
  );
  close = openModal(panel);
}

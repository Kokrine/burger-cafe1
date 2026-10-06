// მთავარი გვერდი (სათაურის ეკრანი): იხსნება ყოველ ჩართვაზე კაფეს ფონზე.
// „თამაში" — შესვლა (ან შენახული სესიით პირდაპირ გაგრძელება), „მასწავლებლისთვის" — პანელი,
// ქვემოთ — მოკლედ, რა არის თამაში (ბავშვს, მშობელს, მასწავლებელს).
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import { currentSession, studentName } from '../../core/auth';
import { chefKey } from '../../core/assets';
import { button, h, img } from '../dom';
import { go } from '../layers';
import { openLogin } from './login';
import { cafeTitle } from '../cafeName';

const DEFAULT_CHEF = 'chef_girl_ponytail_s1_brown';

/** „თამაში": შენახული სესია → კაფე (ან მზარეულის არჩევა), მასწავლებელი → პანელი, სხვა → შესვლა. */
function play() {
  const s = currentSession();
  if (!s) return go('login');
  if (s.kind === 'teacher') return go('teacher');
  go(store.get().chef ? 'menu' : 'character');
}

function teacher() {
  if (currentSession()?.kind === 'teacher') return go('teacher');
  openLogin('teacher');
}

export function homeScreen(): HTMLElement {
  const H = S.home;
  const s = currentSession();
  const playing = s && s.kind !== 'teacher';
  const p = store.get();
  const chef = playing && p.chef ? chefKey(p.chef) : DEFAULT_CHEF;
  const who = s?.kind === 'student' ? studentName() : s?.kind === 'guest' ? H.guest : null;

  const feature = (icon: string, title: string, text: string) =>
    h('div', { class: 'home-card' }, img(icon), h('b', null, title), h('small', null, text));

  return h('div', { class: 'overlay interactive home' }, h('div', { class: 'home-panel' },
    h('div', { class: 'home-top' },
      h('div', { class: 'home-hero' },
        h('div', { class: 'home-chip' }, img('star'), H.grades),
        h('h1', null, playing ? cafeTitle(p) : S.appTitle),
        h('p', { class: 'home-tagline' }, H.tagline),
        h('div', { class: 'home-actions' },
          button(playing ? H.continue : H.play, play, 'green big', 'menu_burger'),
          who ? h('span', { class: 'chip ok' }, img('icon_chef_hat'), t(H.as, { name: who })) : '',
          button(s?.kind === 'teacher' ? H.teacherPanel : H.teacher, teacher, 'white', 'icon_menu_book'),
        ),
      ),
      h('div', { class: 'home-art', 'aria-hidden': 'true' },
        img('customer_nino_happy', 'home-cust a'),
        img(chef, 'home-chef'),
        img('menu_burger', 'home-burger'),
        img('customer_luka_happy', 'home-cust b'),
      ),
    ),
    h('div', { class: 'home-cards' },
      feature('menu_burger', H.f1, H.f1t),
      feature('coin', H.f2, H.f2t),
      feature('icon_level_up', H.f3, H.f3t),
    ),
    h('p', { class: 'home-foot' }, H.foot),
  ));
}

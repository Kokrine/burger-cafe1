// მზარეულის შექმნა: ბიჭი/გოგო, ვარცხნილობა, კანის და თმის ფერი (+ კლასი პირველად).
import tokens from '../../design/tokens.json';
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import { chefKey } from '../../core/assets';
import type { ChefLook, Gender, Grade, HairColor, Skin } from '../../core/types';
import { scaledPrice } from '../../logic/economy';
import { START_MONEY } from '../../config/economy';
import { play } from '../../audio/sfx';
import { button, h, img } from '../dom';
import { burstAt, go } from '../layers';
import { isGuest } from '../../core/auth';

const STYLES: Record<Gender, string[]> = { girl: ['ponytail', 'braids'], boy: ['short', 'curly'] };
const SKINS: Skin[] = ['s1', 's2', 's3', 's4'];
const HAIRS: HairColor[] = ['brown', 'black', 'blonde', 'red'];
const C = tokens.color;
const SKIN_COLOR: Record<Skin, string> = { s1: C.skin1, s2: C.skin2, s3: C.skin3, s4: C.skin4 };
const HAIR_COLOR: Record<HairColor, string> = { brown: C.hairBrown, black: C.hairBlack, blonde: C.hairBlonde, red: C.hairRed };

export function characterScreen(): HTMLElement {
  const p = store.get();
  const firstTime = p.chef === null;
  const pickGrade = firstTime && isGuest();
  const look: ChefLook = p.chef ? { ...p.chef } : { gender: 'girl', style: 'ponytail', skin: 's1', hair: 'red' };
  let grade: Grade = p.grade;

  const preview = img(chefKey(look), '', S.character.title);
  const stage = h('div', { class: 'char-stage' }, preview);
  const options = h('div');

  const refresh = () => {
    preview.src = `${import.meta.env.BASE_URL}assets/${chefKey(look)}.svg`;
    preview.classList.add('swap');
    window.setTimeout(() => preview.classList.remove('swap'), 200);
    renderOptions();
  };

  const opt = (on: boolean, cls: string, onClick: () => void, ...children: (Node | string)[]) =>
    h('button', { class: `opt ${cls} ${on ? 'on' : ''}`, onClick, 'aria-pressed': on ? 'true' : 'false' }, ...children);

  const renderOptions = () => {
    options.replaceChildren(
      h('div', { class: 'opt-group' }, h('h3', null, S.character.who), h('div', { class: 'opts' },
        ...(['girl', 'boy'] as Gender[]).map((g) => opt(look.gender === g, 'portrait', () => {
          if (look.gender === g) return;
          look.gender = g;
          look.style = STYLES[g][0];
          refresh();
        }, img(chefKey({ ...look, gender: g, style: STYLES[g][0] })), S.character.gender[g])),
      )),
      h('div', { class: 'opt-group' }, h('h3', null, S.character.style), h('div', { class: 'opts' },
        ...STYLES[look.gender].map((st) => opt(look.style === st, 'portrait', () => { look.style = st; refresh(); },
          img(chefKey({ ...look, style: st })), S.character.styles[st])),
      )),
      h('div', { class: 'opt-group' }, h('h3', null, S.character.skin), h('div', { class: 'opts' },
        ...SKINS.map((sk) => opt(look.skin === sk, 'swatch', () => { look.skin = sk; refresh(); },
          h('span', { style: `background:${SKIN_COLOR[sk]}` }))),
      )),
      h('div', { class: 'opt-group' }, h('h3', null, S.character.hair), h('div', { class: 'opts' },
        ...HAIRS.map((hr) => opt(look.hair === hr, 'swatch', () => { look.hair = hr; refresh(); },
          h('span', { style: `background:${HAIR_COLOR[hr]}`, title: S.character.hairs[hr] }))),
      )),
      pickGrade ? h('div', { class: 'opt-group' }, h('h3', null, S.character.grade), h('div', { class: 'opts' },
        ...([1, 2, 3, 4] as Grade[]).map((g) => opt(grade === g, 'grade', () => { grade = g; renderOptions(); }, t(S.character.gradeN, { n: g })))),
        h('p', { class: 'hint' }, S.character.gradeHint),
      ) : '',
      h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;margin-top:8px' },
        firstTime ? null : button(S.common.back, () => go('menu'), 'white'),
        button(firstTime ? S.character.start : S.character.saveLook, () => {
          store.update((q) => {
            q.chef = { ...look };
            if (pickGrade && q.grade !== grade) {
              // საწყისი ფული ახალი კლასის მასშტაბით
              q.grade = grade;
              q.money = scaledPrice(START_MONEY, grade);
            }
          });
          play('levelUp');
          burstAt(stage, 14);
          go('menu');
        }, 'green big'),
      ),
    );
  };
  renderOptions();

  return h('div', { class: 'overlay interactive' },
    h('div', { class: 'panel bounce-in' },
      h('div', { class: 'panel-head' }, img('icon_chef_hat'), h('h2', null, S.character.title)),
      h('div', { class: 'panel-body' },
        h('p', { class: 'hint', style: 'margin:0 0 14px;font-size:18px' }, S.character.subtitle),
        h('div', { class: 'char-layout' }, stage, options),
      ),
    ),
  );
}

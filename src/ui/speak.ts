// 🔊 ღილაკი: ტექსტის ხმით წაკითხვა (მათემატიკა, სწავლება).
import { S } from '../i18n/strings.ka';
import { store } from '../core/store';
import { speak, speechAvailable } from '../audio/speech';
import { h, img } from './dom';
import { toast } from './layers';

/** ავტომატური კითხვა: პარამეტრი, თორემ 1 კლასში — ჩართული. */
export const autoRead = () => {
  const p = store.get();
  return speechAvailable() && (p.settings.read ?? p.grade === 1);
};

/** მრგვალი ღილაკი, რომელიც getText()-ს კითხულობს. ხმა მიუწვდომელია — ღილაკი არ ჩანს. */
export function speakButton(getText: () => string): HTMLElement | '' {
  if (!speechAvailable()) return '';
  return h('button', {
    class: 'btn white round speak-btn', type: 'button', 'aria-label': S.speech.read, title: S.speech.read,
    onClick: async (e: MouseEvent) => {
      e.stopPropagation();
      if (!(await speak(getText()))) toast(S.speech.unavailable, 'icon_sound_off');
    },
  }, img('icon_sound_on'));
}

/** ელემენტი + 🔊 ღილაკი გვერდით (getText არ არის — ელემენტის ტექსტს კითხულობს). */
export function withSpeak(el: HTMLElement, getText: () => string = () => el.innerText): HTMLElement {
  const btn = speakButton(getText);
  return btn ? h('div', { class: 'speak-row' }, btn, el) : el;
}

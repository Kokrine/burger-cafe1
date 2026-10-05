// კაფეს სახელი: ბავშვი თვითონ არქმევს (ჩემი ანგარიში → ✏️). ჩანს მენიუს სათაურში.
import { S, t } from '../i18n/strings.ka';
import { store } from '../core/store';
import type { Progress } from '../core/types';
import { button, h, img } from './dom';
import { openModal, toast } from './layers';

export const MAX_NAME = 28;

/** კაფეს სათაური: ბავშვის დარქმეული ან ნაგულისხმევი. */
export const cafeTitle = (p: Pick<Progress, 'cafeName'>) => p.cafeName?.trim() || S.appTitle;

/** სახელის შეცვლის ფანჯარა. აბრუნებს ახალ სახელს (ან null — თუ არ შეცვალა). */
export function askCafeName(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h('input', {
      class: 'field', type: 'text', maxlength: String(MAX_NAME), placeholder: S.cafeName.placeholder,
      'aria-label': S.cafeName.title, value: store.get().cafeName ?? '',
    }) as HTMLInputElement;
    let close = () => {};
    const save = () => {
      const name = input.value.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
      store.update((q) => { q.cafeName = name || undefined; });
      close();
      toast(t(S.cafeName.saved, { name: name || S.appTitle }), 'icon_store');
      resolve(name);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    close = openModal(h('div', { class: 'panel modal bounce-in' },
      h('div', { class: 'panel-head' }, img('icon_store'), h('h2', null, S.cafeName.title)),
      h('button', { class: 'btn white round modal-close', 'aria-label': S.common.close, onClick: () => { close(); resolve(null); } }, '✕'),
      h('div', { class: 'panel-body', style: 'display:flex;flex-direction:column;gap:14px;align-items:stretch' },
        input,
        button(S.cafeName.save, save, 'green big', 'icon_check'),
      ),
    ));
    window.setTimeout(() => input.focus(), 50);
  });
}

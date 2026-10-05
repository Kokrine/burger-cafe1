// მინიმალური DOM დამხმარე: h('div', { class: 'x', onClick }, ...children)
import { play } from '../audio/sfx';
import { t } from '../i18n/strings.ka';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & { class?: string; style?: string; onClick?: (e: MouseEvent) => void };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'onClick') {
      el.addEventListener('click', (e) => {
        play('click');
        (v as (e: MouseEvent) => void)(e as MouseEvent);
      });
    } else if (k.startsWith('on')) {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const img = (key: string, cls = '', alt = '') => h('img', { src: `${import.meta.env.BASE_URL}assets/${key}.svg`, class: cls, alt, draggable: 'false' });

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

/** ღილაკი სტანდარტული სტილით. */
export function button(label: Child, onClick: () => void, cls = '', icon?: string) {
  return h('button', { class: `btn ${cls}`, onClick }, icon ? img(icon) : null, label);
}

/** ერთი ტექსტის გრძელი და მოკლე ვარიანტი — მოკლე ჩანს დაბალ (ჰორიზონტალური ტელეფონის) ეკრანზე (CSS: .txt-long / .txt-short). */
export function both(long: string, short: string, vars: Record<string, string | number> = {}): DocumentFragment {
  const f = document.createDocumentFragment();
  f.append(h('span', { class: 'txt-long' }, t(long, vars)), h('span', { class: 'txt-short' }, t(short, vars)));
  return f;
}

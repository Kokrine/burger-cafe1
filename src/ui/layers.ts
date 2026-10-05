// UI ფენები Phaser-ის ტილოს თავზე: HUD, ეკრანი, მოდალი, შეტყობინება.
import { h, img } from './dom';
import { bus } from '../core/bus';
import { stopSpeech } from '../audio/speech';

export const layers = {
  hud: h('div'),
  screen: h('div'),
  modal: h('div'),
  toast: h('div'),
  /** სწავლების ყუთი — ცალკე, რომ შეტყობინებამ (toast) არ წაშალოს */
  coach: h('div'),
};

export function mountLayers(root: HTMLElement) {
  // შეტყობინება მოდალის ქვეშაა, რომ ამოცანის ფანჯარას არ გადაეფაროს
  root.append(layers.hud, layers.screen, layers.coach, layers.toast, layers.modal);
}

type Screen = () => HTMLElement;
let current = '';
const screens = new Map<string, Screen>();

export function registerScreen(name: string, s: Screen) {
  screens.set(name, s);
}

export function go(name: string) {
  const s = screens.get(name);
  if (!s) throw new Error(`no screen ${name}`);
  current = name;
  layers.screen.replaceChildren(s());
  // ოთახი ინტერფეისის ელემენტებს შორის თავიდან ეწყობა (game/fit.ts)
  bus.emit('layout');
}
export const currentScreen = () => current;

/** მოდალური ფანჯარა; აბრუნებს დახურვის ფუნქციას. */
export function openModal(content: HTMLElement): () => void {
  const ov = h('div', { class: 'overlay interactive' }, content);
  layers.modal.append(ov);
  return () => {
    ov.remove();
    stopSpeech(); // დახურული ფანჯრის ტექსტი აღარ იკითხება
    bus.emit('layout'); // მენიუს ოთახი თავიდან ლაგდება (პანელის დროს ეკრანი შეიძლება შეიცვალა)
  };
}

let toastTimer = 0;
export function toast(text: string, icon = 'icon_sparkle') {
  window.clearTimeout(toastTimer);
  const el = h('div', { class: 'toast' }, img(icon), text);
  layers.toast.replaceChildren(el);
  toastTimer = window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 400);
  }, 2800);
}

/** ვარსკვლავების აფეთქება ელემენტის ცენტრიდან. */
export function burstAt(target: HTMLElement, n = 10) {
  const r = target.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = img(i % 2 ? 'star' : 'icon_sparkle', 'burst');
    s.style.left = `${r.left + r.width / 2 - 20}px`;
    s.style.top = `${r.top + r.height / 2 - 20}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * 120}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * 90}px`);
    s.style.position = 'fixed';
    s.style.zIndex = '100';
    document.body.append(s);
    window.setTimeout(() => s.remove(), 1000);
  }
}

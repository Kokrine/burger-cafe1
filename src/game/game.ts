import Phaser from 'phaser';
import tokens from '../design/tokens.json';
import { BootScene } from './scenes/BootScene';
import { CafeScene } from './scenes/CafeScene';
import { ServiceScene } from './scenes/ServiceScene';
import { bus } from '../core/bus';

/** ლოგიკური ზომა — ყველა კოორდინატი ამ სისტემაშია. */
export const VIEW = { w: 1600, h: 900 };

/** რეზოლუციის კოეფიციენტი: SVG-ები ამ მასშტაბით რასტერიზდება, რომ რეტინაზე მკვეთრი იყოს. */
export const R = (() => {
  const k = window.devicePixelRatio * Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  return Math.min(2, Math.max(1, Math.ceil(k * 2) / 2));
})();

let game: Phaser.Game | null = null;

/** ხილული არე ლოგიკურ ერთეულებში (≥ 1600×900 — EXPAND-ის გამო შეიძლება უფრო განიერი/მაღალი იყოს). */
export function visibleSize(scale: Phaser.Scale.ScaleManager): { w: number; h: number } {
  return { w: scale.width / R, h: scale.height / R };
}

export function createGame(parent: HTMLElement): Phaser.Game {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW.w * R,
    height: VIEW.h * R,
    backgroundColor: tokens.color.bgTop,
    // EXPAND: ტილო მთელ ეკრანს ავსებს; ფართო ტელეფონზე ხილული არე 1600-ზე განიერდება (ცარიელი ზოლები აღარ არის)
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    scene: [BootScene, CafeScene, ServiceScene],
  });
  watchViewport(game);
  return game;
}

/**
 * iPhone/Safari მოტრიალების, ზოლების გამოჩენა-გაქრობის ან აპში დაბრუნების შემდეგ ეკრანის ახალ ზომას
 * დაგვიანებით აცხადებს — ოთახი ძველი ზომით ლაგდებოდა (ზედა ნაწილი იჭრებოდა). ამიტომ ზომის ყოველი
 * ცვლილების შემდეგ რამდენჯერმე ვამოწმებთ და ოთახს თავიდან ვალაგებთ (ბოლო, სწორი ზომით).
 */
function watchViewport(g: Phaser.Game) {
  let timers: number[] = [];
  const settle = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [120, 450, 1000].map((ms) => window.setTimeout(() => {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0); // iOS ზოგჯერ გვერდს ჩამოაცურებს
      g.scale.refresh();
      bus.emit('layout');
    }, ms));
  };
  addEventListener('orientationchange', settle);
  addEventListener('resize', settle);
  addEventListener('pageshow', settle);
  window.visualViewport?.addEventListener('resize', settle);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) settle(); });
}

/** კაფეს ხედი (მენიუ) ↔ სამუშაო დღე. */
export function showScene(key: 'cafe' | 'service') {
  if (!game) return;
  // ჩატვირთვა ჯერ არ დასრულებულა — ვიცდით
  if (game.scene.isActive('boot')) {
    game.scene.getScene('boot').events.once('shutdown', () => showScene(key));
    return;
  }
  const other = key === 'cafe' ? 'service' : 'cafe';
  if (game.scene.isActive(other)) game.scene.stop(other);
  game.scene.start(key);
}

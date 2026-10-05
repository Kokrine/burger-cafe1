// დღის ციკლის ნავიგაცია: მენიუ → დილის საწყობი → სამუშაო დღე (Phaser) → საღამოს ანგარიში.
import { store } from '../../core/store';
import { bus } from '../../core/bus';
import { ensureToday } from '../../logic/day';
import { showScene } from '../../game/game';
import { h } from '../dom';
import { go } from '../layers';


/** „კაფეს გახსნა": თუ დღე უკვე ნათამაშებია — პირდაპირ ანგარიშზე, თორემ საწყობში. */
export function startDay() {
  if (store.get().today?.played) {
    go('report');
    return;
  }
  store.update((q) => { ensureToday(q); });
  go('warehouse');
}

/** სამუშაო დღის DOM ფენა (თავად თამაში Phaser-შია; ვერტიკალურ ეკრანს ui/orientation ბლოკავს). */
export function serviceScreen(): HTMLElement {
  return h('div');
}

export function mountDayEnd() {
  bus.on('dayEnd', () => {
    showScene('cafe');
    go('report');
  });
}

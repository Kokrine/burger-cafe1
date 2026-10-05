// თამაში მხოლოდ ჰორიზონტალურად (iPhone, Android, პლანშეტები).
//  * ვერტიკალურ მდგომარეობაში ყველაფერს ფარავს „მოატრიალე" ეკრანი და სამუშაო დღე პაუზდება;
//  * Android: პირველ შეხებაზე — სრული ეკრანი + ჰორიზონტალური ჩაკეტვა (Screen Orientation API);
//  * iPhone: Safari ორიენტაციის ჩაკეტვას არ იძლევა — მოტრიალების ეკრანი ასრულებს ამ როლს.
import { S } from '../i18n/strings.ka';
import { bus } from '../core/bus';
import { h } from './dom';

/** სენსორული მოწყობილობა ვერტიკალურად (დესკტოპის ვიწრო ფანჯარას არ ვბლოკავთ). */
const PORTRAIT_TOUCH = '(orientation: portrait) and (pointer: coarse)';

export const isBlockedPortrait = () => window.matchMedia?.(PORTRAIT_TOUCH).matches ?? false;

export function mountOrientationGuard() {
  const overlay = h('div', { id: 'rotate', role: 'alertdialog', 'aria-live': 'assertive' },
    h('div', { class: 'rotate-phone', 'aria-hidden': 'true' }, h('span')),
    h('p', { class: 'rotate-title' }, S.mobile.rotate),
    h('p', { class: 'rotate-sub' }, S.mobile.rotateSub),
  );
  document.body.append(overlay);

  const mq = window.matchMedia?.(PORTRAIT_TOUCH);
  const sync = () => bus.emit('rotate', isBlockedPortrait());
  mq?.addEventListener?.('change', sync);
  sync();

  // Android Chrome: სრული ეკრანი + ჰორიზონტალური ჩაკეტვა პირველივე შეხებაზე
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse) window.addEventListener('pointerdown', () => void lockLandscape(), { once: true, passive: true });
}

/** სრული ეკრანი და ჰორიზონტალური ჩაკეტვა (სადაც ბრაუზერი უშვებს). */
export async function lockLandscape() {
  const standalone = window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches;
  try {
    if (!standalone && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch { /* iPhone Safari და ზოგი ბრაუზერი სრულ ეკრანს არ უშვებს — არაუშავს */ }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch { /* ჩაკეტვა მხოლოდ სრულ ეკრანზე/დაყენებულ აპში მუშაობს — მოტრიალების ეკრანი დაგვეხმარება */ }
}

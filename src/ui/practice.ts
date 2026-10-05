// ვარჯიში (ჩემი ანგარიშიდან): 5 ამოცანა ერთ მოქმედებაზე. შეცდომაზე იგივე მინიშნებები და
// ამოხსნა ჩანს, რაც კაფეში; ადაპტური სირთულე და სიზუსტე ჩვეულებრივ ითვლება.
import { S, t } from '../i18n/strings.ka';
import { store } from '../core/store';
import type { Op } from '../core/types';
import { bump } from '../logic/badges';
import { PRACTICE_BONUS_STARS, practiceSet } from '../logic/practice';
import { play } from '../audio/sfx';
import { askProblem } from './mathModal';
import { burstAt, toast } from './layers';

let running = false;

/** აბრუნებს: რამდენი ამოცანა ამოიხსნა და რამდენი — პირველივე ცდით. */
export async function runPractice(op: Op): Promise<{ done: number; firstTry: number } | null> {
  if (running) return null;
  running = true;
  try {
    const p0 = store.get();
    const set = practiceSet(op, p0.grade, p0.adaptive?.[op].level);
    let done = 0, firstTry = 0;
    for (let i = 0; i < set.length; i++) {
      const before = store.get().accuracy[op].firstTry;
      const title = t(S.practice.title, { op: S.profile.ops[op], i: i + 1, n: set.length });
      if (!(await askProblem(title, set[i]))) break; // ✕ — ვარჯიში წყდება
      done += 1;
      if (store.get().accuracy[op].firstTry > before) firstTry += 1;
    }
    if (!done) return { done, firstTry };
    const perfect = done === set.length && firstTry === set.length;
    store.update((q) => {
      bump(q, 'practice', done);
      if (perfect) q.stars += PRACTICE_BONUS_STARS;
    });
    play(perfect ? 'levelUp' : 'coin');
    toast(perfect ? t(S.practice.perfect, { n: PRACTICE_BONUS_STARS }) : t(S.practice.result, { ok: firstTry, n: done }), perfect ? 'star' : 'icon_check');
    const anchor = document.querySelector('#ui .toast');
    if (perfect && anchor) burstAt(anchor as HTMLElement, 12);
    return { done, firstTry };
  } finally {
    running = false;
  }
}

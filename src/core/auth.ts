// ვინ თამაშობს ახლა: მოსწავლე, სტუმარი ან მასწავლებელი (პანელი).
import { backend } from '../data';
import type { Session } from '../data/backend';
import { store } from './store';
import { bus } from './bus';

let current: Session | null = null;

export const currentSession = () => current;
/** თამაშობს თუ არა ვინმე (HUD და თამაშის ეკრანები). */
export const isPlaying = () => current?.kind === 'student' || current?.kind === 'guest';
export const isGuest = () => current?.kind === 'guest';
export const studentName = () => (current?.kind === 'student' ? current.nickname : null);

/** სესიის გახსნა: პროგრესის ჩატვირთვა და მიმაგრება შესანახად. */
export async function enterSession(s: Session) {
  current = s;
  if (s.kind === 'teacher') {
    store.detach();
  } else {
    const p = await backend.loadProgress(s);
    store.attach(p, s.kind === 'student' ? s.grade : null, (q) => void backend.saveProgress(s, q));
  }
  bus.emit('session-changed', s);
}

export async function signOut() {
  store.flush();
  await backend.signOut();
  current = null;
  store.detach();
  bus.emit('session-changed', null);
}

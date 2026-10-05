// მიმდინარე სამუშაო დღის მდგომარეობა HUD-ისთვის (საათი, მიზანი, შემოსავალი).
import { bus } from './bus';

export const session = {
  active: false,
  clock: '09:00',
  goal: 0,
  earned: 0,
};

export function setSession(patch: Partial<typeof session>) {
  Object.assign(session, patch);
  bus.emit('session');
}

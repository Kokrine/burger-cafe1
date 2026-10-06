import './styles/app.css';
import { loadManifest } from './core/assets';
import { store } from './core/store';
import { enterSession, isPlaying } from './core/auth';
import { backend, prepareBackend } from './data';
import { S, t } from './i18n/strings.ka';
import { checkBadges } from './logic/badges';
import { bus } from './core/bus';
import { play, unlockAudio } from './audio/sfx';
import { createGame } from './game/game';
import { currentScreen, go, mountLayers, registerScreen, toast } from './ui/layers';
import { mountHud } from './ui/hud';
import { mountOrientationGuard } from './ui/orientation';
import { characterScreen } from './ui/screens/character';
import { menuScreen } from './ui/screens/menu';
import { shopScreen } from './ui/screens/shop';
import { mountDayEnd, serviceScreen } from './ui/screens/service';
import { warehouseScreen } from './ui/screens/warehouse';
import { reportScreen } from './ui/screens/report';
import { loginScreen } from './ui/screens/login';
import { teacherScreen } from './ui/screens/teacher';
import { profileScreen } from './ui/screens/profile';
import { homeScreen } from './ui/screens/home';
import { BADGES } from './logic/badges';
import { questValue, settleQuests, type Quest } from './logic/quests';
import { questText, rewardText } from './ui/quests';

/** ოფლაინ რეჟიმი: მხოლოდ გამოქვეყნებულ ვერსიაში (dev-ში ქეში ცვლილებებს დამალავდა). */
function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
registerOffline();

async function boot() {
  await Promise.all([
    loadManifest(),
    prepareBackend(),
    document.fonts?.load('800 20px "Noto Sans Georgian"').catch(() => undefined),
  ]);
  const assetsReady = new Promise<void>((res) => bus.on('assets-ready', () => res()));
  const game = createGame(document.getElementById('game')!);
  // ტესტირებისთვის (მხოლოდ dev რეჟიმში)
  if (import.meta.env.DEV) Object.assign(window, { __game: game, __store: store });
  mountLayers(document.getElementById('ui')!);
  registerScreen('home', homeScreen);
  registerScreen('login', loginScreen);
  registerScreen('teacher', teacherScreen);
  registerScreen('character', characterScreen);
  registerScreen('menu', menuScreen);
  registerScreen('profile', profileScreen);
  registerScreen('shop', shopScreen);
  registerScreen('service', serviceScreen);
  registerScreen('warehouse', warehouseScreen);
  registerScreen('report', reportScreen);
  mountDayEnd();
  mountHud();
  unlockAudio();
  mountOrientationGuard();

  // ეკრანები ჩანს მხოლოდ ჩატვირთვის შემდეგ (პროგრესის ზოლს არაფერი ფარავს)
  await assetsReady;

  // შენახული სესია: მოსწავლე/სტუმარი → თამაში, მასწავლებელი → პანელი, სხვა → შესვლა
  let session = backend.getSession();
  // ღრუბლის სესია შეიძლება ვადაგასული იყოს (ან კომპიუტერზე სხვა შევიდა) — მაშინ თავიდან შესვლა
  if (session && backend.validateSession && !(await backend.validateSession(session))) {
    await backend.signOut();
    session = null;
  }
  if (session) await enterSession(session);
  // ყოველთვის მთავარი გვერდით ვიწყებთ: „თამაში" — შესვლა ან შენახული სესიის გაგრძელება
  go('home');

  // დონის შეცვლისას მთავარი მენიუს სათაური განახლდეს
  let level = store.get().cafeLevel;
  store.subscribe((p) => {
    if (p.cafeLevel !== level) {
      level = p.cafeLevel;
      if (currentScreen() === 'menu') go('menu');
    }
  });

  // ბეჯები: ყოველი ცვლილების შემდეგ ვამოწმებთ, ხომ არ მოიპოვა ახალი
  store.subscribe((p) => {
    if (!isPlaying()) return;
    const fresh = checkBadges(p);
    if (!fresh.length) return;
    store.update((q) => { q.badges.push(...fresh.filter((id) => !q.badges.includes(id))); });
    fresh.forEach((id, i) => window.setTimeout(() => {
      const b = BADGES.find((x) => x.id === id)!;
      toast(t(S.badges.newBadge, { name: t(S.badges.list[id].name, { n: b.target(p.grade) }) }), b.icon);
      play('badge');
    }, 1200 + i * 3000));
  });

  // დღის დავალებები: შესრულებისთანავე ჯილდო (ბიზნესი → ₾, მათემატიკა → ⭐)
  store.subscribe((p) => {
    if (!isPlaying()) return;
    const td = p.today;
    if (!td?.quests?.some((q) => !q.done && questValue(q, td) >= q.target)) return;
    let fresh: Quest[] = [];
    store.update((q) => { fresh = settleQuests(q); });
    fresh.forEach((q, i) => window.setTimeout(() => {
      toast(`${t(S.quests.done, { name: questText(q) })} ${rewardText(q)}`, q.kind === 'math' ? 'star' : 'coin');
      play('badge');
    }, 600 + i * 2500));
  });

  // გვერდის დახურვისას ბოლო ცვლილებები შევინახოთ
  addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });
}

void boot();

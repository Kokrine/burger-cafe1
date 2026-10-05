// პროგრესის საცავი მეხსიერებაში. შენახვა ხდება მიმაგრებული ანგარიშის მეშვეობით
// (data/backend — ოფლაინ localStorage ან მოგვიანებით Supabase).
import type { Grade, Progress } from './types';
import { ITEMS, START_MENU, START_MONEY, START_STOCK } from '../config/economy';
import { scaledPrice } from '../logic/economy';
import { newAdaptive } from '../logic/math/generator';

export function newProgress(grade: Grade = 2): Progress {
  const owned: Record<string, number> = {};
  for (const it of ITEMS) if (it.starter) owned[it.id] = 1;
  const op = () => ({ attempts: 0, firstTry: 0, correct: 0 });
  return {
    version: 1,
    grade,
    chef: null,
    money: scaledPrice(START_MONEY, grade),
    points: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
    day: 1,
    cafeLevel: 1,
    branches: 1,
    owned,
    menu: [...START_MENU],
    stock: { ...START_STOCK } as Record<string, number>,
    today: null,
    accuracy: { add: op(), sub: op(), mul: op(), div: op() },
    adaptive: { add: newAdaptive(), sub: newAdaptive(), mul: newAdaptive(), div: newAdaptive() },
    counters: {},
    dayStreak: 0,
    lastPlayDate: '',
    lastActive: null,
    badges: [],
    history: [],
    settings: { sound: true },
  };
}

/** ძველი შენახვები ახალ ველებს ავსებს ნაგულისხმევით. */
export function normalize(p: Progress): Progress {
  const base = newProgress(p.grade);
  return { ...base, ...p, counters: { ...(p.counters ?? {}) }, stock: { ...base.stock, ...(p.stock ?? {}) } };
}

type Listener = (p: Progress) => void;
type Persist = (p: Progress) => void;

class Store {
  private p: Progress = newProgress();
  private persist: Persist | null = null;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  get(): Progress {
    return this.p;
  }

  /** ანგარიშის მიმაგრება: p — შენახული პროგრესი (ან null — ახალი), grade — კლასის დონე მასწავლებლისგან. */
  attach(p: Progress | null, grade: Grade | null, persist: Persist) {
    this.p = p ? normalize(p) : newProgress(grade ?? 2);
    if (grade && this.p.grade !== grade) this.p.grade = grade;
    this.persist = persist;
    this.flush();
    this.emit();
  }

  detach() {
    this.flush();
    this.persist = null;
    this.p = newProgress();
    this.emit();
  }

  /** ცვლილება + შენახვა + ყველა მსმენელის განახლება. */
  update(fn: (p: Progress) => void) {
    fn(this.p);
    this.p.lastActive = new Date().toISOString();
    this.scheduleSave();
    this.emit();
  }

  replace(p: Progress) {
    this.p = p;
    this.scheduleSave();
    this.emit();
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    for (const l of this.listeners) l(this.p);
  }

  private scheduleSave() {
    if (!this.persist) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 150);
  }

  /** დაუყოვნებლივ შენახვა (გასვლისას, გვერდის დახურვისას). */
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.persist?.(this.p);
  }
}

export const store = new Store();

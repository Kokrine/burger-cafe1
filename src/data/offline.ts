// ოფლაინ რეჟიმი: ყველაფერი ამ მოწყობილობის localStorage-ში.
// PIN და პაროლი ინახება მხოლოდ „მარილიანი" SHA-256 ჰეშით. ეს რეჟიმი ერთი
// მოწყობილობისთვისაა (კლასის კომპიუტერი/პლანშეტი); რეალური დაცვა — Supabase-ით.
import type { Grade, Progress } from '../core/types';
import {
  BackendFailure, type Backend, type ClassInfo, type Roster, type Session, type StudentPublic,
  type StudentSession, type StudentSummary, type Teacher,
} from './backend';
import { DEMO } from './demo';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface TeacherRow { id: string; email: string; salt: string; hash: string }
interface ClassRow { id: string; teacherId: string; name: string; grade: Grade; code: string }
interface StudentRow { id: string; classId: string; nickname: string; salt: string; hash: string; failed: number; lockedUntil: number }

const K = {
  teachers: 'bc:teachers',
  classes: 'bc:classes',
  students: 'bc:students',
  session: 'bc:session',
  progress: (id: string) => `bc:progress:${id}`,
  guest: 'burger-cafe:progress:v1', // ძველი შენახვა — „სტუმრად თამაში"
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O და 1/I გარეშე
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const randomPin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

export async function hashSecret(salt: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class OfflineBackend implements Backend {
  readonly mode = 'offline' as const;
  constructor(private kv: KV) {}

  private read<T>(key: string, fallback: T): T {
    try {
      const raw = this.kv.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  private write(key: string, v: unknown) {
    try { this.kv.setItem(key, JSON.stringify(v)); } catch { /* სავსე მეხსიერება / პირადი რეჟიმი */ }
  }
  private teachers() { return this.read<TeacherRow[]>(K.teachers, []); }
  private classes() { return this.read<ClassRow[]>(K.classes, []); }
  private students() { return this.read<StudentRow[]>(K.students, []); }

  /** დემო კლასი პირველ გაშვებაზე (src/data/demo.ts). */
  async seedDemo() {
    if (this.classes().length || this.teachers().length) return;
    const t: TeacherRow = { id: uid(), email: DEMO.teacherEmail, salt: uid(), hash: '' };
    t.hash = await hashSecret(t.salt, DEMO.teacherPassword);
    const c: ClassRow = { id: uid(), teacherId: t.id, name: DEMO.className, grade: DEMO.grade, code: DEMO.classCode };
    const students: StudentRow[] = [];
    for (const nickname of DEMO.students) {
      const s: StudentRow = { id: uid(), classId: c.id, nickname, salt: uid(), hash: '', failed: 0, lockedUntil: 0 };
      s.hash = await hashSecret(s.salt, DEMO.pin);
      students.push(s);
    }
    this.write(K.teachers, [t]);
    this.write(K.classes, [c]);
    this.write(K.students, students);
  }

  // ---------------- სესია ----------------
  getSession(): Session | null { return this.read<Session | null>(K.session, null); }
  async signOut() { this.kv.removeItem(K.session); }
  playAsGuest() { this.write(K.session, { kind: 'guest' } satisfies Session); }

  private teacherOf(): Teacher {
    const s = this.getSession();
    if (!s || s.kind !== 'teacher') throw new BackendFailure('bad-login');
    return s.teacher;
  }

  // ---------------- მასწავლებელი ----------------
  async teacherSignUp(email: string, password: string): Promise<Teacher> {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || password.length < 6) throw new BackendFailure('bad-input');
    const list = this.teachers();
    if (list.some((t) => t.email === e)) throw new BackendFailure('email-taken');
    const row: TeacherRow = { id: uid(), email: e, salt: uid(), hash: '' };
    row.hash = await hashSecret(row.salt, password);
    this.write(K.teachers, [...list, row]);
    const teacher = { id: row.id, email: row.email };
    this.write(K.session, { kind: 'teacher', teacher } satisfies Session);
    return teacher;
  }

  async teacherSignIn(email: string, password: string): Promise<Teacher> {
    const row = this.teachers().find((t) => t.email === email.trim().toLowerCase());
    if (!row || (await hashSecret(row.salt, password)) !== row.hash) throw new BackendFailure('bad-login');
    const teacher = { id: row.id, email: row.email };
    this.write(K.session, { kind: 'teacher', teacher } satisfies Session);
    return teacher;
  }

  async listClasses(): Promise<ClassInfo[]> {
    const t = this.teacherOf();
    const st = this.students();
    return this.classes().filter((c) => c.teacherId === t.id)
      .map((c) => ({ id: c.id, name: c.name, grade: c.grade, code: c.code, studentCount: st.filter((s) => s.classId === c.id).length }));
  }

  private ownClass(classId: string): ClassRow {
    const t = this.teacherOf();
    const c = this.classes().find((x) => x.id === classId && x.teacherId === t.id);
    if (!c) throw new BackendFailure('not-found');
    return c;
  }

  async createClass(name: string, grade: Grade): Promise<ClassInfo> {
    const t = this.teacherOf();
    const n = name.trim();
    if (!n || n.length > 40) throw new BackendFailure('bad-input');
    const all = this.classes();
    let code = '';
    do code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    while (all.some((c) => c.code === code));
    const row: ClassRow = { id: uid(), teacherId: t.id, name: n, grade, code };
    this.write(K.classes, [...all, row]);
    return { id: row.id, name: row.name, grade, code, studentCount: 0 };
  }

  async setClassGrade(classId: string, grade: Grade) {
    this.ownClass(classId);
    this.write(K.classes, this.classes().map((c) => (c.id === classId ? { ...c, grade } : c)));
  }

  async addStudent(classId: string, nickname: string): Promise<{ student: StudentPublic; pin: string }> {
    this.ownClass(classId);
    const n = nickname.trim();
    if (!n || n.length > 30) throw new BackendFailure('bad-input');
    const pin = randomPin();
    const row: StudentRow = { id: uid(), classId, nickname: n, salt: uid(), hash: '', failed: 0, lockedUntil: 0 };
    row.hash = await hashSecret(row.salt, pin);
    this.write(K.students, [...this.students(), row]);
    return { student: { id: row.id, nickname: n }, pin };
  }

  private ownStudent(studentId: string): StudentRow {
    const s = this.students().find((x) => x.id === studentId);
    if (!s) throw new BackendFailure('not-found');
    this.ownClass(s.classId);
    return s;
  }

  async resetPin(studentId: string): Promise<string> {
    const s = this.ownStudent(studentId);
    const pin = randomPin();
    const hash = await hashSecret(s.salt, pin);
    this.write(K.students, this.students().map((x) => (x.id === studentId ? { ...x, hash, failed: 0, lockedUntil: 0 } : x)));
    return pin;
  }

  async removeStudent(studentId: string) {
    this.ownStudent(studentId);
    this.write(K.students, this.students().filter((x) => x.id !== studentId));
    this.kv.removeItem(K.progress(studentId));
  }

  async classOverview(classId: string): Promise<StudentSummary[]> {
    this.ownClass(classId);
    return this.students().filter((s) => s.classId === classId).map((s) => {
      const p = this.read<Progress | null>(K.progress(s.id), null);
      const op = () => ({ attempts: 0, firstTry: 0, correct: 0 });
      return {
        id: s.id, nickname: s.nickname,
        points: p?.points ?? 0, stars: p?.stars ?? 0, money: p?.money ?? 0, day: p?.day ?? 1, cafeLevel: p?.cafeLevel ?? 1,
        badges: p?.badges?.length ?? 0,
        accuracy: p?.accuracy ?? { add: op(), sub: op(), mul: op(), div: op() },
        lastActive: p?.lastActive ?? null,
      };
    });
  }

  // ---------------- მოსწავლე ----------------
  async roster(classCode: string): Promise<Roster> {
    const code = classCode.trim().toUpperCase();
    const c = this.classes().find((x) => x.code === code);
    if (!c) throw new BackendFailure('bad-code');
    const students = this.students().filter((s) => s.classId === c.id)
      .map((s) => ({ id: s.id, nickname: s.nickname }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ka'));
    return { classId: c.id, className: c.name, grade: c.grade, students };
  }

  async studentSignIn(classCode: string, studentId: string, pin: string): Promise<StudentSession> {
    const r = await this.roster(classCode);
    const list = this.students();
    const s = list.find((x) => x.id === studentId && x.classId === r.classId);
    if (!s) throw new BackendFailure('not-found');
    const now = Date.now();
    if (s.lockedUntil > now) throw new BackendFailure('locked', s.lockedUntil);
    const ok = (await hashSecret(s.salt, pin)) === s.hash;
    const failed = ok ? 0 : s.failed + 1;
    const lockedUntil = failed >= MAX_FAILS ? now + LOCK_MS : 0;
    this.write(K.students, list.map((x) => (x.id === s.id ? { ...x, failed: lockedUntil ? 0 : failed, lockedUntil } : x)));
    if (!ok) throw new BackendFailure(lockedUntil ? 'locked' : 'bad-pin', lockedUntil || undefined);
    const session: StudentSession = { kind: 'student', studentId: s.id, nickname: s.nickname, classId: r.classId, className: r.className, grade: r.grade };
    this.write(K.session, session);
    return session;
  }

  async loadProgress(session: Session): Promise<Progress | null> {
    if (session.kind === 'teacher') return null;
    const key = session.kind === 'guest' ? K.guest : K.progress(session.studentId);
    return this.read<Progress | null>(key, null);
  }

  async saveProgress(session: Session, p: Progress) {
    if (session.kind === 'teacher') return;
    const key = session.kind === 'guest' ? K.guest : K.progress(session.studentId);
    this.write(key, p);
  }
}

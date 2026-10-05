// Supabase რეჟიმი: მონაცემები ღრუბელში (supabase/schema.sql), იგივე Backend ინტერფეისით.
//  * მასწავლებელი — Supabase Auth (ელფოსტა + პაროლი).
//  * მოსწავლე — ანონიმური სესია + student_login(კოდი, მოსწავლე, PIN) ფუნქცია.
//  * სტუმარი — მხოლოდ ამ მოწყობილობაზე (localStorage), როგორც ოფლაინ რეჟიმში.
// პროგრესის ასლი ინახება ლოკალურადაც: ინტერნეტი თუ გაწყდა, თამაში არ იკარგება
// და შემდეგ შენახვაზე (ან ხაზზე დაბრუნებისას) ღრუბელში აიტვირთება.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Grade, Op, Progress } from '../core/types';
import {
  BackendFailure, type Backend, type ClassInfo, type Roster, type Session, type StudentPublic,
  type StudentSession, type StudentSummary, type Teacher,
} from './backend';
import { OfflineBackend } from './offline';

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const K = {
  session: 'bc:sb:session',
  progress: (id: string) => `bc:sb:progress:${id}`,
  pending: (id: string) => `bc:sb:pending:${id}`,
};

interface ProgressRow {
  points: number; stars: number; money: number; day: number; cafe_level: number; badges: number;
  accuracy: StudentSummary['accuracy'] | Record<string, never>; last_active: string | null;
}

const emptyAccuracy = (): StudentSummary['accuracy'] => {
  const op = () => ({ attempts: 0, firstTry: 0, correct: 0 });
  return { add: op(), sub: op(), mul: op(), div: op() } as Record<Op, ReturnType<typeof op>>;
};

/** ქსელის/სერვერის შეცდომა → ბავშვისთვის გასაგები კოდი. */
function fail(error: { message?: string } | null | undefined, fallback: BackendFailure['code'] = 'network'): never {
  const m = (error?.message ?? '').toLowerCase();
  if (m.includes('fetch') || m.includes('network')) throw new BackendFailure('network');
  throw new BackendFailure(fallback);
}

export class SupabaseBackend implements Backend {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;
  private local: OfflineBackend;

  constructor(url: string, anonKey: string, private kv: KV) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bc:sb:auth' } });
    this.local = new OfflineBackend(kv);
    // ხაზზე დაბრუნებისას — ჩაუწერელი პროგრესის ატვირთვა
    globalThis.addEventListener?.('online', () => void this.flushPending());
  }

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

  // ---------------- სესია ----------------
  getSession(): Session | null { return this.read<Session | null>(K.session, null); }

  async signOut() {
    this.kv.removeItem(K.session);
    await this.sb.auth.signOut().catch(() => undefined);
  }

  playAsGuest() { this.write(K.session, { kind: 'guest' } satisfies Session); }

  /** მასწავლებლის ფუნქციებისთვის: შესული უნდა იყოს ელფოსტით (არა ანონიმურად). */
  private async teacherId(): Promise<string> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user || data.user.is_anonymous) throw new BackendFailure('bad-login');
    return data.user.id;
  }

  // ---------------- მასწავლებელი ----------------
  async teacherSignUp(email: string, password: string): Promise<Teacher> {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || password.length < 6) throw new BackendFailure('bad-input');
    await this.sb.auth.signOut().catch(() => undefined);
    const redirect = `${location.origin}${import.meta.env.BASE_URL}`;
    const { data, error } = await this.sb.auth.signUp({ email: e, password, options: { emailRedirectTo: redirect } });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes('already') || m.includes('registered')) throw new BackendFailure('email-taken');
      if (m.includes('password')) throw new BackendFailure('bad-input');
      fail(error, 'bad-input');
    }
    // ელფოსტის დადასტურება ჩართულია → სესია ჯერ არ არის
    if (!data.session || !data.user) throw new BackendFailure('confirm-email');
    // Supabase არსებულ ელფოსტაზე შეცდომას არ აბრუნებს — მომხმარებელს identities ცარიელი აქვს
    if (data.user.identities && data.user.identities.length === 0) throw new BackendFailure('email-taken');
    const teacher = { id: data.user.id, email: data.user.email ?? e };
    this.write(K.session, { kind: 'teacher', teacher } satisfies Session);
    return teacher;
  }

  async teacherSignIn(email: string, password: string): Promise<Teacher> {
    await this.sb.auth.signOut().catch(() => undefined);
    const { data, error } = await this.sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (error.message.toLowerCase().includes('not confirmed')) throw new BackendFailure('confirm-email');
      fail(error, 'bad-login');
    }
    const teacher = { id: data.user.id, email: data.user.email ?? email };
    this.write(K.session, { kind: 'teacher', teacher } satisfies Session);
    return teacher;
  }

  async listClasses(): Promise<ClassInfo[]> {
    await this.teacherId();
    // students(count) ცხრილზე სრულ SELECT-ს ითხოვს, მოსწავლეებზე კი მხოლოდ რამდენიმე სვეტია ღია
    // (pin_hash დამალულია) — ამიტომ ვიღებთ id-ებს და ვითვლით აქ.
    const { data, error } = await this.sb.from('classes').select('id, name, grade, code, students(id)').order('created_at');
    if (error) fail(error);
    return (data ?? []).map((c) => ({
      id: c.id as string, name: c.name as string, grade: c.grade as Grade, code: c.code as string,
      studentCount: (c.students as { id: string }[] | null)?.length ?? 0,
    }));
  }

  async createClass(name: string, grade: Grade): Promise<ClassInfo> {
    await this.teacherId();
    const n = name.trim();
    if (!n || n.length > 40) throw new BackendFailure('bad-input');
    const { data, error } = await this.sb.rpc('create_class', { p_name: n, p_grade: grade });
    if (error || !data) fail(error, 'bad-input');
    const row = data as { id: string; name: string; grade: Grade; code: string };
    return { id: row.id, name: row.name, grade: row.grade, code: row.code, studentCount: 0 };
  }

  async setClassGrade(classId: string, grade: Grade) {
    await this.teacherId();
    const { error } = await this.sb.from('classes').update({ grade }).eq('id', classId);
    if (error) fail(error, 'not-found');
  }

  async addStudent(classId: string, nickname: string): Promise<{ student: StudentPublic; pin: string }> {
    await this.teacherId();
    const n = nickname.trim();
    if (!n || n.length > 30) throw new BackendFailure('bad-input');
    const { data, error } = await this.sb.rpc('add_student', { p_class: classId, p_nickname: n });
    if (error) fail(error, 'not-found');
    const row = (Array.isArray(data) ? data[0] : data) as { student_id: string; pin: string } | undefined;
    if (!row) throw new BackendFailure('not-found');
    return { student: { id: row.student_id, nickname: n }, pin: row.pin };
  }

  async resetPin(studentId: string): Promise<string> {
    await this.teacherId();
    const { data, error } = await this.sb.rpc('reset_pin', { p_student: studentId });
    if (error || typeof data !== 'string') fail(error, 'not-found');
    return data as string;
  }

  async removeStudent(studentId: string) {
    await this.teacherId();
    const { error } = await this.sb.from('students').delete().eq('id', studentId);
    if (error) fail(error, 'not-found');
  }

  async classOverview(classId: string): Promise<StudentSummary[]> {
    await this.teacherId();
    const { data, error } = await this.sb.from('students')
      .select('id, nickname, progress(points, stars, money, day, cafe_level, badges, accuracy, last_active)')
      .eq('class_id', classId)
      .order('nickname');
    if (error) fail(error);
    return (data ?? []).map((s) => {
      const raw = s.progress as ProgressRow | ProgressRow[] | null;
      const p = Array.isArray(raw) ? raw[0] : raw;
      const acc = p?.accuracy && 'add' in p.accuracy ? (p.accuracy as StudentSummary['accuracy']) : emptyAccuracy();
      return {
        id: s.id as string, nickname: s.nickname as string,
        points: p?.points ?? 0, stars: p?.stars ?? 0, money: p?.money ?? 0, day: p?.day ?? 1, cafeLevel: p?.cafe_level ?? 1,
        badges: p?.badges ?? 0, accuracy: acc, lastActive: p?.last_active ?? null,
      };
    });
  }

  // ---------------- მოსწავლე ----------------
  async roster(classCode: string): Promise<Roster> {
    const code = classCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new BackendFailure('bad-code');
    const { data, error } = await this.sb.rpc('class_roster', { p_code: code });
    if (error) fail(error);
    const rows = (data ?? []) as { class_id: string; class_name: string; grade: Grade; student_id: string | null; nickname: string | null }[];
    if (!rows.length) throw new BackendFailure('bad-code');
    const students = rows.filter((r) => r.student_id)
      .map((r) => ({ id: r.student_id!, nickname: r.nickname! }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ka'));
    return { classId: rows[0].class_id, className: rows[0].class_name, grade: rows[0].grade, students };
  }

  async studentSignIn(classCode: string, studentId: string, pin: string): Promise<StudentSession> {
    // მოსწავლეს ელფოსტა არ აქვს — ანონიმური სესია, რომელსაც student_login მოსწავლეს აკავშირებს
    const { data: cur } = await this.sb.auth.getUser();
    if (!cur.user || !cur.user.is_anonymous) {
      await this.sb.auth.signOut().catch(() => undefined);
      const { error } = await this.sb.auth.signInAnonymously();
      if (error) fail(error);
    }
    const { data, error } = await this.sb.rpc('student_login', { p_code: classCode.trim().toUpperCase(), p_student: studentId, p_pin: pin });
    if (error) fail(error);
    const r = data as { ok: boolean; error?: string; until?: string; student_id: string; nickname: string; class_id: string; class_name: string; grade: Grade };
    if (!r.ok) {
      if (r.error === 'locked') throw new BackendFailure('locked', r.until ? Date.parse(r.until) : undefined);
      throw new BackendFailure(r.error === 'bad-pin' ? 'bad-pin' : 'not-found');
    }
    const session: StudentSession = { kind: 'student', studentId: r.student_id, nickname: r.nickname, classId: r.class_id, className: r.class_name, grade: r.grade };
    this.write(K.session, session);
    return session;
  }

  async loadProgress(session: Session): Promise<Progress | null> {
    if (session.kind === 'teacher') return null;
    if (session.kind === 'guest') return this.local.loadProgress(session);
    const cached = this.read<Progress | null>(K.progress(session.studentId), null);
    try {
      const { data, error } = await this.sb.from('progress').select('data').eq('student_id', session.studentId).maybeSingle();
      if (error) throw error;
      const remote = data?.data && Object.keys(data.data as object).length ? (data.data as Progress) : null;
      // ლოკალური ასლი უფრო ახალია (მაგ. ინტერნეტის გარეშე ნათამაშევი) → ის ვიღებთ და ავტვირთავთ
      if (cached && (!remote || (cached.lastActive ?? '') > (remote.lastActive ?? ''))) {
        void this.saveProgress(session, cached);
        return cached;
      }
      return remote;
    } catch {
      return cached;
    }
  }

  async saveProgress(session: Session, p: Progress) {
    if (session.kind === 'teacher') return;
    if (session.kind === 'guest') return this.local.saveProgress(session, p);
    this.write(K.progress(session.studentId), p);
    const { error } = await this.sb.from('progress').update({
      data: p, points: p.points, stars: p.stars, money: p.money, day: p.day, cafe_level: p.cafeLevel,
      badges: p.badges?.length ?? 0, accuracy: p.accuracy, last_active: new Date().toISOString(),
    }).eq('student_id', session.studentId);
    if (error) this.write(K.pending(session.studentId), true);
    else this.kv.removeItem(K.pending(session.studentId));
  }

  /** ინტერნეტის დაბრუნებისას: ბოლო ლოკალური პროგრესის ატვირთვა. */
  private async flushPending() {
    const s = this.getSession();
    if (s?.kind !== 'student' || !this.read<boolean>(K.pending(s.studentId), false)) return;
    const p = this.read<Progress | null>(K.progress(s.studentId), null);
    if (p) await this.saveProgress(s, p);
  }
}

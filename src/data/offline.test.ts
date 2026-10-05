import { describe, expect, it } from 'vitest';
import { OfflineBackend } from './offline';
import { BackendFailure } from './backend';
import { DEMO } from './demo';
import { newProgress } from '../core/store';

const memKV = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), raw: m };
};

const fail = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return (e as BackendFailure).code; }
  return 'ok';
};

describe('ოფლაინ ანგარიშები', () => {
  it('მასწავლებელი: რეგისტრაცია, კლასი 6-სიმბოლოიანი კოდით, მოსწავლე PIN-ით', async () => {
    const kv = memKV();
    const b = new OfflineBackend(kv);
    await b.teacherSignUp('Teacher@School.ge', 'secret12');
    expect(b.getSession()).toMatchObject({ kind: 'teacher' });
    const c = await b.createClass('2ა', 2);
    expect(c.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const { student, pin } = await b.addStudent(c.id, 'ნიკა');
    expect(pin).toMatch(/^\d{4}$/);
    // PIN და პაროლი ღიად არსად ინახება
    const dump = [...kv.raw.values()].join('');
    expect(dump).not.toContain('secret12');
    expect(dump).not.toContain(`"${pin}"`);
    // მოსწავლე შედის კოდით + სახელით + PIN-ით
    await b.signOut();
    const r = await b.roster(c.code.toLowerCase());
    expect(r.students).toEqual([{ id: student.id, nickname: 'ნიკა' }]);
    expect(r.grade).toBe(2);
    const s = await b.studentSignIn(c.code, student.id, pin);
    expect(s).toMatchObject({ kind: 'student', nickname: 'ნიკა', grade: 2 });
  });

  it('ცუდი კოდი, ცუდი PIN და ბლოკირება 5 შეცდომის შემდეგ', async () => {
    const b = new OfflineBackend(memKV());
    await b.teacherSignUp('t@t.ge', 'secret12');
    const c = await b.createClass('3ბ', 3);
    const { student, pin } = await b.addStudent(c.id, 'ანა');
    expect(await fail(b.roster('ZZZZZZ'))).toBe('bad-code');
    const wrong = pin === '0000' ? '1111' : '0000';
    for (let i = 0; i < 4; i++) expect(await fail(b.studentSignIn(c.code, student.id, wrong))).toBe('bad-pin');
    expect(await fail(b.studentSignIn(c.code, student.id, wrong))).toBe('locked');
    expect(await fail(b.studentSignIn(c.code, student.id, pin))).toBe('locked');
  });

  it('PIN-ის აღდგენა: ძველი აღარ მუშაობს, ახალი მუშაობს', async () => {
    const b = new OfflineBackend(memKV());
    await b.teacherSignUp('t@t.ge', 'secret12');
    const c = await b.createClass('1ა', 1);
    const { student, pin } = await b.addStudent(c.id, 'გიო');
    const fresh = await b.resetPin(student.id);
    if (fresh !== pin) expect(await fail(b.studentSignIn(c.code, student.id, pin))).toBe('bad-pin');
    await b.teacherSignIn('t@t.ge', 'secret12');
    expect((await b.studentSignIn(c.code, student.id, fresh)).kind).toBe('student');
  });

  it('კლასის წაშლა: მხოლოდ მფლობელს, მოსწავლეებითა და პროგრესით', async () => {
    const kv = memKV();
    const b = new OfflineBackend(kv);
    await b.teacherSignUp('a@a.ge', 'secret12');
    const keep = await b.createClass('A', 2);
    const gone = await b.createClass('B', 2);
    const { student } = await b.addStudent(gone.id, 'ნინო');
    kv.setItem(`bc:progress:${student.id}`, '{}');
    await b.teacherSignUp('b@b.ge', 'secret12');
    expect(await fail(b.deleteClass(gone.id))).toBe('not-found');
    await b.teacherSignIn('a@a.ge', 'secret12');
    await b.deleteClass(gone.id);
    expect((await b.listClasses()).map((c) => c.id)).toEqual([keep.id]);
    expect(kv.getItem(`bc:progress:${student.id}`)).toBeNull();
    expect(await fail(b.roster(gone.code))).toBe('bad-code');
  });

  it('მასწავლებელი მხოლოდ თავის კლასს ხედავს', async () => {
    const b = new OfflineBackend(memKV());
    await b.teacherSignUp('a@a.ge', 'secret12');
    const ca = await b.createClass('A', 2);
    await b.teacherSignUp('b@b.ge', 'secret12');
    expect(await b.listClasses()).toEqual([]);
    expect(await fail(b.classOverview(ca.id))).toBe('not-found');
    expect(await fail(b.addStudent(ca.id, 'x'))).toBe('not-found');
  });

  it('პროგრესი ინახება მოსწავლეზე და ჩანს მასწავლებლის პანელში', async () => {
    const b = new OfflineBackend(memKV());
    await b.teacherSignUp('t@t.ge', 'secret12');
    const c = await b.createClass('2ა', 2);
    const { student, pin } = await b.addStudent(c.id, 'მარიამი');
    const s = await b.studentSignIn(c.code, student.id, pin);
    const p = newProgress(2);
    p.points = 120;
    p.accuracy.add = { attempts: 10, firstTry: 8, correct: 9 };
    p.lastActive = new Date().toISOString();
    await b.saveProgress(s, p);
    expect((await b.loadProgress(s))?.points).toBe(120);
    await b.teacherSignIn('t@t.ge', 'secret12');
    const [row] = await b.classOverview(c.id);
    expect(row).toMatchObject({ nickname: 'მარიამი', points: 120 });
    expect(row.accuracy.add.firstTry).toBe(8);
    expect(Object.keys(row)).not.toContain('pin');
  });

  it('დემო კლასი იქმნება მხოლოდ ცარიელ მოწყობილობაზე', async () => {
    const kv = memKV();
    const b = new OfflineBackend(kv);
    await b.seedDemo();
    const r = await b.roster(DEMO.classCode);
    expect(r.students.map((s) => s.nickname).sort()).toEqual([...DEMO.students].sort());
    await b.seedDemo();
    expect((await b.roster(DEMO.classCode)).students).toHaveLength(DEMO.students.length);
  });

  it('სტუმარი ძველ შენახვას იყენებს', async () => {
    const kv = memKV();
    const old = newProgress(3);
    old.money = 777;
    kv.setItem('burger-cafe:progress:v1', JSON.stringify(old));
    const b = new OfflineBackend(kv);
    b.playAsGuest();
    expect((await b.loadProgress({ kind: 'guest' }))?.money).toBe(777);
  });
});

// მონაცემების ფენის ინტერფეისი: ოფლაინ (localStorage, offline.ts) ან Supabase (supabase.ts, supabase/schema.sql).
import type { Grade, Op, Progress } from '../core/types';

export interface Teacher { id: string; email: string }

export interface ClassInfo { id: string; name: string; grade: Grade; code: string; studentCount: number }

export interface StudentPublic { id: string; nickname: string }

export interface Roster { classId: string; className: string; grade: Grade; students: StudentPublic[] }

export interface StudentSession { kind: 'student'; studentId: string; nickname: string; classId: string; className: string; grade: Grade }
export interface TeacherSession { kind: 'teacher'; teacher: Teacher }
export interface GuestSession { kind: 'guest' }
export type Session = StudentSession | TeacherSession | GuestSession;

/** მასწავლებლის პანელის მწკრივი — მხოლოდ სასწავლო და თამაშის მონაცემები. */
export interface StudentSummary {
  id: string;
  nickname: string;
  points: number;
  stars: number;
  money: number;
  day: number;
  cafeLevel: number;
  badges: number;
  accuracy: Record<Op, { attempts: number; firstTry: number; correct: number }>;
  lastActive: string | null;
}

export type BackendError = 'email-taken' | 'bad-login' | 'bad-code' | 'bad-pin' | 'locked' | 'bad-input' | 'not-found' | 'confirm-email' | 'network';
export class BackendFailure extends Error {
  constructor(public code: BackendError, public until?: number) {
    super(code);
  }
}

export interface Backend {
  readonly mode: 'offline' | 'supabase';
  // სესია
  getSession(): Session | null;
  signOut(): Promise<void>;
  playAsGuest(): void;
  // მასწავლებელი
  teacherSignUp(email: string, password: string): Promise<Teacher>;
  teacherSignIn(email: string, password: string): Promise<Teacher>;
  listClasses(): Promise<ClassInfo[]>;
  createClass(name: string, grade: Grade): Promise<ClassInfo>;
  setClassGrade(classId: string, grade: Grade): Promise<void>;
  /** კლასი თავისი მოსწავლეებით და მათი პროგრესით. */
  deleteClass(classId: string): Promise<void>;
  /** აბრუნებს ახალ (ან მოცემულ) PIN-ს — მასწავლებელს ერთხელ ეჩვენება. */
  addStudent(classId: string, nickname: string): Promise<{ student: StudentPublic; pin: string }>;
  resetPin(studentId: string): Promise<string>;
  removeStudent(studentId: string): Promise<void>;
  classOverview(classId: string): Promise<StudentSummary[]>;
  // მოსწავლე
  roster(classCode: string): Promise<Roster>;
  studentSignIn(classCode: string, studentId: string, pin: string): Promise<StudentSession>;
  loadProgress(session: Session): Promise<Progress | null>;
  saveProgress(session: Session, p: Progress): Promise<void>;
  /** გაშვებისას შენახული სესიის შემოწმება (Supabase: ავტორიზაცია ისევ მოქმედებს?). */
  validateSession?(session: Session): Promise<boolean>;
}

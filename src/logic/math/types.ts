import type { Op } from '../../core/types';

/** ვიზუალური მინიშნება პირველი შეცდომის შემდეგ. */
export type Hint =
  | { type: 'coins'; groups: number[]; crossed?: number }            // მონეტების დათვლა (ჯგუფებად; ბოლო N გადახაზული)
  | { type: 'line'; from: number; to: number }                        // რიცხვითი წრფე
  | { type: 'place'; top: number; bottom: number; sign: '+' | '−' }   // თანრიგები სვეტებად
  | { type: 'groups'; groups: number; size: number; icon: string }    // გამრავლება: ჯგუფები საგნებით
  | { type: 'share'; total: number; parts: number; icon: string }     // გაყოფა: თანაბრად დარიგება
  | { type: 'bills'; denom: number; count: number };                  // კუპიურების დათვლა

export interface Step { expr: string; value: number }

/** ამოცანების ტიპები — ტექსტი strings.ka.ts-ის S.problems[kind]-შია. */
export type Kind =
  | 'remain' | 'payChange' | 'bills'          // მაღაზია
  | 'sum' | 'sumPromo' | 'change' | 'share'   // სალარო
  | 'group' | 'groupRem' | 'packs' | 'budget'  // საწყობი / სამზარეულო
  | 'revenue' | 'expenses' | 'profit' | 'loss'  // საღამოს ანგარიში
  | 'hours' | 'cookTime' | 'fraction';         // დილის მომზადება: დრო, წილადები

export interface Problem {
  kind: Kind;
  vars: Record<string, string | number>;
  op: Op;
  answer: number;
  input: 'choice' | 'keypad' | 'change';
  choices?: number[];
  denoms?: number[];       // ხურდის ასარჩევი მონეტები/კუპიურები
  steps: Step[];
  hint: Hint;
}

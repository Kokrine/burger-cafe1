// სირთულე კლასის მიხედვით. შეცვალე აქ — გენერატორი და ტესტები ამ ფაილს კითხულობენ.
import type { Grade, Op } from '../core/types';

export interface GradeConfig {
  /** ყველაზე დიდი რიცხვი ამოცანაში (ოპერანდი ან პასუხი). */
  max: number;
  /** რომელი მოქმედებებია დაშვებული. */
  ops: Op[];
  /** პასუხის შეყვანა: 3 ვარიანტიდან არჩევა ან ციფრული კლავიატურა. */
  answer: 'choice' | 'keypad';
  /** გამრავლებისას დაშვებული მამრავლები (რაოდენობა × ფასი). */
  factors: number[];
  /** თანაბრად გაყოფისას დაშვებული გამყოფები (მეგობრები, თეფშები). */
  divisors: number[];
  /** გაყოფა ნაშთით (4 კლასი). */
  remainder: boolean;
  /** რამდენ ნაბიჯიანი შეიძლება იყოს ამოცანა. */
  maxSteps: number;
  /** აქცია: „3 წვენი 2-ის ფასად". */
  discount: boolean;
  /** ერთი სახის გვერდითი კერძის მაქს. რაოდენობა შეკვეთაში. */
  qtyMax: number;
  /** ხურდისთვის ხელმისაწვდომი მონეტები და კუპიურები. */
  denoms: number[];
}

export const DIFFICULTY: Record<Grade, GradeConfig> = {
  1: { max: 20, ops: ['add', 'sub'], answer: 'choice', factors: [], divisors: [], remainder: false, maxSteps: 1, discount: false, qtyMax: 1, denoms: [1, 2, 5, 10] },
  2: { max: 100, ops: ['add', 'sub', 'mul', 'div'], answer: 'keypad', factors: [2, 5, 10], divisors: [2], remainder: false, maxSteps: 2, discount: false, qtyMax: 2, denoms: [1, 2, 5, 10, 20, 50] },
  3: { max: 1000, ops: ['add', 'sub', 'mul', 'div'], answer: 'keypad', factors: [2, 3, 4, 5, 6, 7, 8, 9, 10], divisors: [2, 3, 4, 5], remainder: false, maxSteps: 2, discount: false, qtyMax: 3, denoms: [1, 2, 5, 10, 20, 50, 100] },
  4: { max: 10000, ops: ['add', 'sub', 'mul', 'div'], answer: 'keypad', factors: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], divisors: [2, 3, 4, 5, 6, 7, 8, 9], remainder: true, maxSteps: 3, discount: true, qtyMax: 3, denoms: [1, 2, 5, 10, 20, 50, 100, 200] },
};

/**
 * ადაპტური სირთულე: დონე 0..4 თითოეულ მოქმედებაზე. 5 ზედიზედ სწორი → +1,
 * ბოლო 6 პასუხში 2 შეცდომა → −1. დონე ცვლის რიცხვების დიაპაზონს კლასის ფარგლებში.
 */
export const ADAPTIVE = {
  levels: 5,
  start: 2,
  upAfter: 5,
  window: 6,
  downAfterErrors: 2,
  /** რიცხვების დიაპაზონის წილი კლასის მაქსიმუმიდან თითოეულ დონეზე. */
  range: [0.35, 0.5, 0.7, 0.85, 1],
};

/** კლიენტის კუპიურები. */
export const PAY_BILLS = [5, 10, 20, 50, 100, 200, 500];

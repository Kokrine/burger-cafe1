import { describe, expect, it } from 'vitest';
import { speakable } from './speech';

describe('ხმით კითხვა: სიმბოლოები სიტყვებად', () => {
  it('ლარი, მოქმედებები და ტოლობა', () => {
    expect(speakable('4 შეკვრა × 3 ₾ = ?')).toBe('4 შეკვრა გამრავლებული 3 ლარი უდრის ?');
    expect(speakable('12 ÷ 4 + 1')).toBe('12 გაყოფილი 4 პლუს 1');
    expect(speakable('10 − 3')).toBe('10 მინუს 3');
    expect(speakable('საჭიროა ≈ 6')).toBe('საჭიროა დაახლოებით 6');
  });
  it('ემოჯი და უცხო სიმბოლოები იშლება, სიგრძე ≤ 400', () => {
    expect(speakable('ყოჩაღ! 🍔 ⭐')).toBe('ყოჩაღ!');
    expect(speakable('ა'.repeat(500)).length).toBe(400);
  });
});

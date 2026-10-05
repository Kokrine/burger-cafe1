// დღის მოვლენები: ზოგ დღეს რაღაც განსაკუთრებული ხდება (დილით საწყობში ჩანს).
// მოვლენა დღის ნომრით ირჩევა — გვერდის გადატვირთვისას არ იცვლება.

export type DayEventId = 'festival' | 'sunny' | 'rainy' | 'vip';

export interface DayEventDef {
  icon: string;
  /** კლიენტების რაოდენობის კოეფიციენტი. */
  customers: number;
  /** გვერდითი კერძის ალბათობა (ნაგულისხმევი — SERVICE.sideChance). */
  sideChance?: number;
  /** მოთმინების კოეფიციენტი. */
  patience?: number;
  /** ერთი განსაკუთრებული სტუმარი, ჩაის ფული ×vipTip. */
  vipTip?: number;
}

export const DAY_EVENTS: Record<DayEventId, DayEventDef> = {
  festival: { icon: 'icon_people', customers: 1.5 },
  sunny: { icon: 'menu_juice', customers: 1, sideChance: 0.85 },
  rainy: { icon: 'icon_clock', customers: 0.75, patience: 1.3 },
  vip: { icon: 'star', customers: 1, vipTip: 3 },
};

/** რამდენ დღეში ერთხელ (დაახლოებით) ხდება მოვლენა. პირველ დღეს — არასდროს (სწავლება). */
export const EVENT_CHANCE = 0.4;

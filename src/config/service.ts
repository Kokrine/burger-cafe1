// სამუშაო დღის ბალანსი: რეცეპტები, დროები, მოთმინება. (ფასები — economy.ts-ში.)
import type { Grade } from '../core/types';
import type { ProductId } from './economy';

export type Layer = 'bun_bottom' | 'patty' | 'cheese' | 'tomato' | 'lettuce' | 'onion' | 'ketchup' | 'mayo' | 'bun_top';
export type Ingredient = 'bun' | 'patty' | 'cheese' | 'tomato' | 'lettuce' | 'onion' | 'ketchup' | 'mayo';
export type Side = 'juice' | 'fries' | 'icecream';
export type BurgerId = Extract<ProductId, 'burger' | 'cheeseburger' | 'double'>;

/** ბურგერის ვარიანტები: შუა ფენები ქვემოდან ზემოთ (ფუნთუშის გარეშე). */
export const RECIPES: Record<BurgerId, Layer[][]> = {
  burger: [['patty', 'ketchup'], ['patty', 'mayo'], ['patty', 'lettuce', 'ketchup']],
  cheeseburger: [['patty', 'cheese', 'tomato'], ['patty', 'cheese', 'onion'], ['patty', 'cheese', 'lettuce']],
  double: [['patty', 'cheese', 'patty', 'cheese'], ['patty', 'lettuce', 'patty', 'cheese']],
};

export const SIDES: Side[] = ['juice', 'fries', 'icecream'];

/** ინგრედიენტის ყუთი → ფენა (ფუნთუშა ქვედაა ან ზედა — აწყობის მიხედვით). */
export const INGREDIENTS: Ingredient[] = ['bun', 'patty', 'cheese', 'tomato', 'lettuce', 'onion', 'ketchup', 'mayo'];

export const SERVICE = {
  /** კოტლეტის ცხობა (წამი) — იყოფა სწრაფი გრილის კოეფიციენტზე. */
  cookTime: 5,
  /** რამდენ ხანს რჩება მზად, სანამ დაიწვება. */
  readyWindow: 7,
  drinkTime: 2.5,
  friesTime: 4,
  icecreamTime: 2,
  /** კლიენტის მოთმინება (წამი) — მრავლდება დეკორის ეფექტზე და კლასის კოეფიციენტზე. */
  patience: 55,
  patienceByGrade: { 1: 1.4, 2: 1.2, 3: 1, 4: 0.9 } as Record<Grade, number>,
  /** პირველი კლიენტი, შემდეგ ყოველი ახალი (წამი). */
  firstSpawn: 1.5,
  spawnEvery: 11,
  /** სასმელის/გვერდითი კერძის ალბათობა შეკვეთაში. */
  sideChance: 0.55,
  /** ჩაის ფული (₾) კმაყოფილი / ნეიტრალური კლიენტისგან, საბაზისო (მრავლდება კლასზე). */
  tip: { happy: 2, neutral: 1, angry: 0 },
  /** სამუშაო საათები HUD-ის საათისთვის. */
  openHour: 9,
  closeHour: 17,
  /** დღის მიზანი = მოსალოდნელი შემოსავლის ეს წილი. */
  goalShare: 0.6,
};


/**
 * მარაგის ამოწურვა დღის განმავლობაში: სასწრაფო მიწოდება ძვირია (დილით ყიდვა იაფია),
 * კურიერი რამდენიმე წამში მოდის.
 */
export const EMERGENCY = {
  markup: 1.5,        // ფასი × 1.5 (ზევით დამრგვალებული)
  deliverySeconds: 7, // რამდენ წამში მოდის კურიერი
  maxPacks: 3,        // მაქსიმუმ რამდენი შეკვრა ერთ ჯერზე
};

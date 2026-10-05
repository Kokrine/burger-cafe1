// ეკონომიკის ბალანსი: ფასები, ინვენტარი, მენიუ, კაფეს დონეები.
// ყველა ფასი „საბაზისოა" (3 კლასისთვის). სხვა კლასებისთვის მრავლდება
// GRADE_SCALE-ზე და მრგვალდება ROUND_TO-მდე, რომ რიცხვები კლასის დონეს შეესაბამებოდეს.
import type { Grade } from '../core/types';

export const GRADE_SCALE: Record<Grade, number> = { 1: 0.2, 2: 0.5, 3: 1, 4: 2 };

/** მრგვალდება: მცირე ფასი — 1-მდე, დიდი — ათეულამდე (1 კლ.) / ორმოცდაათამდე (2 კლ.) და ა.შ. */
export const ROUND_TO: Record<Grade, { small: number; big: number; bigFrom: number }> = {
  1: { small: 1, big: 10, bigFrom: 20 },
  2: { small: 1, big: 50, bigFrom: 100 },
  3: { small: 5, big: 50, bigFrom: 300 },
  4: { small: 5, big: 100, bigFrom: 1000 },
};

/** საწყისი ფული (საბაზისო, მრავლდება GRADE_SCALE-ზე). */
export const START_MONEY = 100;

// ---------------- მენიუს პროდუქტები ----------------
export type ProductId = 'burger' | 'cheeseburger' | 'double' | 'juice' | 'fries' | 'icecream';

/** ფასი და თვითღირებულება თითოეული კლასისთვის ცალკე: [გასაყიდი, თვითღირებულება]. */
export const PRODUCTS: Record<ProductId, { icon: string; prices: Record<Grade, [number, number]>; unlockedBy?: string }> = {
  burger: { icon: 'menu_burger', prices: { 1: [3, 1], 2: [5, 2], 3: [8, 3], 4: [12, 5] } },
  juice: { icon: 'menu_juice', prices: { 1: [2, 1], 2: [2, 1], 3: [3, 1], 4: [4, 2] } },
  cheeseburger: { icon: 'menu_cheeseburger', prices: { 1: [4, 2], 2: [7, 3], 3: [10, 4], 4: [15, 6] }, unlockedBy: 'recipeCheese' },
  double: { icon: 'menu_double', prices: { 1: [5, 3], 2: [10, 5], 3: [15, 7], 4: [24, 11] }, unlockedBy: 'recipeDouble' },
  fries: { icon: 'fries', prices: { 1: [2, 1], 2: [3, 1], 3: [4, 2], 4: [6, 2] }, unlockedBy: 'fryer' },
  icecream: { icon: 'menu_icecream', prices: { 1: [3, 1], 2: [4, 2], 3: [6, 3], 4: [9, 4] }, unlockedBy: 'iceCream' },
};
export const START_MENU: ProductId[] = ['burger', 'juice'];

// ---------------- ინვენტარი და განვითარება ----------------
export type Category = 'equipment' | 'decor' | 'menu' | 'expansion';

export interface Effects {
  grillSlots?: number;       // გრილის დამატებითი ადგილები
  cookSpeed?: number;        // ცხობის სიჩქარე (+0.3 = 30%-ით სწრაფი)
  autoDrink?: boolean;       // სასმელი თავისით ივსება
  changeHint?: boolean;      // სალარო ხურდის მინიშნებას აჩვენებს
  patience?: number;         // კლიენტების მოთმინება (+0.05 = 5%)
  customers?: number;        // დამატებითი კლიენტები დღეში
  unlock?: ProductId;        // ახალი პროდუქტი მენიუში
  level?: number;            // კაფეს ახალი დონე
  branch?: boolean;          // მეორე ფილიალი
}

export interface ItemDef {
  id: string;
  category: Category;
  basePrice: number;
  icon: string;              // ასეტის გასაღები
  max: number;               // მაქსიმუმ რამდენი შეიძლება
  minLevel: number;          // კაფეს მინიმალური დონე
  requires?: string[];       // სხვა ნივთები, რომლებიც ჯერ უნდა გქონდეს
  minItems?: number;         // რამდენი ნივთი უნდა გქონდეს (დონის ასამაღლებლად)
  effects: Effects;
  starter?: boolean;         // თავიდანვე აქვს
}

export const ITEMS: ItemDef[] = [
  // ---- თავიდანვე არის ----
  { id: 'grill1', category: 'equipment', basePrice: 0, icon: 'grill', max: 1, minLevel: 1, effects: { grillSlots: 4 }, starter: true },
  { id: 'drinkBasic', category: 'equipment', basePrice: 0, icon: 'drink_machine', max: 1, minLevel: 1, effects: {}, starter: true },
  { id: 'stove', category: 'equipment', basePrice: 0, icon: 'stove_pots', max: 1, minLevel: 1, effects: {}, starter: true },
  { id: 'cashBox', category: 'equipment', basePrice: 0, icon: 'cash_box', max: 1, minLevel: 1, effects: {}, starter: true },
  { id: 'plantStarter', category: 'decor', basePrice: 0, icon: 'plant', max: 1, minLevel: 1, effects: {}, starter: true },

  // ---- მოწყობილობები ----
  { id: 'grill2', category: 'equipment', basePrice: 90, icon: 'grill', max: 1, minLevel: 1, effects: { grillSlots: 4 } },
  { id: 'fryer', category: 'equipment', basePrice: 70, icon: 'fryer', max: 1, minLevel: 1, effects: { unlock: 'fries' } },
  { id: 'cashRegister', category: 'equipment', basePrice: 60, icon: 'cash_register', max: 1, minLevel: 1, effects: { changeHint: true } },
  { id: 'drinkAuto', category: 'equipment', basePrice: 80, icon: 'drink_machine_auto', max: 1, minLevel: 2, effects: { autoDrink: true } },
  { id: 'grillFast', category: 'equipment', basePrice: 120, icon: 'grill_fast', max: 1, minLevel: 2, effects: { cookSpeed: 0.3 } },
  { id: 'iceCream', category: 'equipment', basePrice: 150, icon: 'ice_cream_machine', max: 1, minLevel: 3, effects: { unlock: 'icecream' } },

  // ---- მომსახურება და დეკორი ----
  { id: 'plant', category: 'decor', basePrice: 20, icon: 'plant', max: 2, minLevel: 1, effects: { patience: 0.05 } },
  { id: 'picture', category: 'decor', basePrice: 30, icon: 'picture_right', max: 2, minLevel: 1, effects: { patience: 0.05 } },
  { id: 'table', category: 'decor', basePrice: 60, icon: 'table_set', max: 3, minLevel: 1, effects: { customers: 2 } },
  { id: 'plantBig', category: 'decor', basePrice: 40, icon: 'plant_big', max: 2, minLevel: 2, effects: { patience: 0.08 } },
  { id: 'jukebox', category: 'decor', basePrice: 100, icon: 'jukebox', max: 1, minLevel: 2, effects: { patience: 0.15 } },

  // ---- მენიუს გაფართოება (რეცეპტები) ----
  { id: 'recipeCheese', category: 'menu', basePrice: 40, icon: 'menu_cheeseburger', max: 1, minLevel: 1, effects: { unlock: 'cheeseburger' } },
  { id: 'recipeDouble', category: 'menu', basePrice: 80, icon: 'menu_double', max: 1, minLevel: 2, requires: ['recipeCheese'], effects: { unlock: 'double' } },

  // ---- ბიზნესის გაფართოება ----
  { id: 'level2', category: 'expansion', basePrice: 250, icon: 'icon_level_up', max: 1, minLevel: 1, minItems: 3, effects: { level: 2, customers: 2 } },
  { id: 'level3', category: 'expansion', basePrice: 500, icon: 'icon_level_up', max: 1, minLevel: 2, minItems: 6, effects: { level: 3, customers: 2 } },
  { id: 'level4', category: 'expansion', basePrice: 1000, icon: 'icon_level_up', max: 1, minLevel: 3, minItems: 9, effects: { level: 4, customers: 3 } },
  { id: 'branch2', category: 'expansion', basePrice: 2000, icon: 'icon_store', max: 1, minLevel: 4, minItems: 12, effects: { branch: true } },
];

/** საბაზისო მაჩვენებლები ნივთების გარეშე. */
export const BASE_STATS = {
  customersPerDay: 6,
  patience: 1,
  cookSpeed: 1,
};

/** კაფეს დონეები: ოთახის ზომა ფილებში, დახლის სიგრძე, კლიენტების ადგილები. */
export const CAFE_LEVELS = {
  1: { room: [11, 8], counter: 6, spots: 3 },
  2: { room: [12, 8], counter: 7, spots: 4 },
  3: { room: [13, 9], counter: 8, spots: 4 },
  4: { room: [13, 9], counter: 8, spots: 4 },
} as const;
export type CafeLevel = keyof typeof CAFE_LEVELS;

// ---------------- საწყობი (ინგრედიენტები) ----------------
export type StockId = 'bun' | 'patty' | 'cheese' | 'tomato' | 'lettuce' | 'onion' | 'ketchup' | 'mayo' | 'juice' | 'potato' | 'icecream';

/** შეკვრა: რამდენი ცალი/პორციაა და რა ღირს (კლასების მიხედვით 1..4). */
export const STOCK: Record<StockId, { icon: string; pack: number; price: Record<Grade, number> }> = {
  bun: { icon: 'layer_bun_top', pack: 4, price: { 1: 2, 2: 3, 3: 4, 4: 8 } },
  patty: { icon: 'layer_patty', pack: 4, price: { 1: 3, 2: 5, 3: 8, 4: 15 } },
  cheese: { icon: 'layer_cheese', pack: 5, price: { 1: 2, 2: 3, 3: 5, 4: 10 } },
  tomato: { icon: 'layer_tomato', pack: 5, price: { 1: 1, 2: 2, 3: 3, 4: 6 } },
  lettuce: { icon: 'layer_lettuce', pack: 5, price: { 1: 1, 2: 2, 3: 3, 4: 5 } },
  onion: { icon: 'layer_onion', pack: 5, price: { 1: 1, 2: 2, 3: 2, 4: 4 } },
  ketchup: { icon: 'layer_ketchup', pack: 8, price: { 1: 2, 2: 3, 3: 4, 4: 8 } },
  mayo: { icon: 'layer_mayo', pack: 8, price: { 1: 2, 2: 3, 3: 4, 4: 8 } },
  juice: { icon: 'menu_juice', pack: 6, price: { 1: 2, 2: 3, 3: 5, 4: 10 } },
  potato: { icon: 'fries', pack: 5, price: { 1: 2, 2: 3, 3: 5, 4: 9 } },
  icecream: { icon: 'menu_icecream', pack: 6, price: { 1: 3, 2: 5, 3: 8, 4: 15 } },
};

/** რომელი პროდუქტისთვისაა საჭირო (საწყობში მხოლოდ საჭირო ინგრედიენტები ჩანს). */
export const SIDE_STOCK: Record<'juice' | 'fries' | 'icecream', StockId> = { juice: 'juice', fries: 'potato', icecream: 'icecream' };

/** საწყისი მარაგი — პირველი დღისთვის. */
export const START_STOCK: Partial<Record<StockId, number>> = { bun: 8, patty: 8, ketchup: 8, mayo: 8, lettuce: 5, juice: 6 };

/** ქირა და კომუნალური დღეში: კლასის ბაზა × კაფეს დონის კოეფიციენტი. */
export const RENT_BASE: Record<Grade, number> = { 1: 2, 2: 5, 3: 10, 4: 20 };
export const RENT_LEVEL = [1, 1, 1.5, 2, 3];

/** მეორე ფილიალის დღიური შემოსავალი (საბაზისო, მრავლდება GRADE_SCALE-ზე). */
export const BRANCH_INCOME = 40;

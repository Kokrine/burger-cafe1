export type Grade = 1 | 2 | 3 | 4;
export type Op = 'add' | 'sub' | 'mul' | 'div';
export type Mood = 'happy' | 'neutral' | 'angry';

export type Gender = 'girl' | 'boy';
export type Skin = 's1' | 's2' | 's3' | 's4';
export type HairColor = 'brown' | 'black' | 'blonde' | 'red';

export interface ChefLook {
  gender: Gender;
  style: string;
  skin: Skin;
  hair: HairColor;
}

export interface OpStats {
  attempts: number;   // რამდენი ამოცანა
  firstTry: number;   // პირველივე ცდაზე სწორი
  correct: number;    // საბოლოოდ სწორი (მეორე ცდით ჩათვლით)
}

export interface DayRecord {
  day: number;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  stars: number;
  date: string;
}

/** მიმდინარე დღე: დილის ყიდვიდან საღამოს ანგარიშამდე. */
export interface Today {
  day: number;
  goal: number;
  rent: number;
  purchases: { id: string; packs: number; cost: number; emergency?: boolean }[];
  ingredients: number;          // ინგრედიენტებზე დახარჯული ₾
  sales: Record<string, number>; // პროდუქტი → გაყიდული რაოდენობა
  revenue: number;              // შემოსავალი (ჩაის ფულის ჩათვლით)
  tips: number;
  served: number;
  left: number;
  wasted: number;               // გადაყრილი / დამწვარი
  startStars: number;
  played: boolean;              // სამუშაო დღე დასრულდა — ანგარიში ელოდება
  branch?: number;              // მეორე ფილიალის დღიური შემოსავალი
  stockouts?: string[];         // რა ამოიწურა დღის განმავლობაში
  missed?: number;              // კლიენტები, ვისაც მარაგის გამო ვერ მოემსახურე
  seen?: number;                // რამდენი კლიენტი მოვიდა დღეს (გადატვირთვის შემდეგ გაგრძელებისთვის)
  grade?: Grade;                // კლასი, რომლითაც დღე დაიწყო (ფასები ანგარიშში)
  closed?: boolean;             // ადრე დაიკეტა (მარაგის გამო)
  streak?: number;              // დღის მიმდინარე სერია (სწორი პირველივე ცდით ზედიზედ)
  quests?: import('../logic/quests').Quest[]; // დღის დავალებები
  happy?: number;               // კმაყოფილი (მხიარული) კლიენტები
  mathFirst?: number;           // დღეს პირველივე ცდით ამოხსნილი ამოცანები
  changeFirst?: number;         // დღეს პირველივე ცდით დაბრუნებული ხურდა
  bestStreak?: number;          // დღის საუკეთესო სერია
  hours?: [number, number];     // სამუშაო საათები [გახსნა, დახურვა] — დილის ამოცანაც და საათიც მათ იყენებს
  aid?: string[];               // მომწოდებლის უფასო დახმარება (ფულის გარეშე ჩარჩენისას)
  event?: import('../config/events').DayEventId; // დღის მოვლენა (ფესტივალი, წვიმა…)
  reportDone?: Record<string, string>; // საღამოს ანგარიშის დათვლილი ნაბიჯები (გადატვირთვაზე არ იკარგება)
}

/** მოსწავლის მთელი პროგრესი — ინახება localStorage-ში (შემდეგ Supabase-შიც). */
export interface Progress {
  version: 1;
  grade: Grade;
  chef: ChefLook | null;
  // ფინანსები (₾) — არასდროს ერევა ქულებს
  money: number;
  // სასწავლო მიღწევები — იმატებს მხოლოდ სწორი პასუხებით
  points: number;
  stars: number;
  streak: number;
  bestStreak: number;
  // კაფე
  day: number;
  cafeLevel: number;
  branches: number;
  owned: Record<string, number>;
  menu: string[];
  /** საწყობის მარაგი (ცალი/პორცია). */
  stock: Record<string, number>;
  /** მიმდინარე დღე (null — დღე ჯერ არ დაწყებულა). */
  today: Today | null;
  // სტატისტიკა
  accuracy: Record<Op, OpStats>;
  /** ადაპტური სირთულე თითოეულ მოქმედებაზე (დონე 0..4). */
  adaptive: Record<Op, { level: number; run: number; recent: boolean[] }>;
  /** მთვლელები ბეჯებისთვის: burgers, served, ok_add/sub/mul/div, change_ok, profit_total, goals… */
  counters: Record<string, number>;
  /** რამდენი კალენდარული დღე ზედიზედ ითამაშა და ბოლო თამაშის თარიღი (YYYY-MM-DD). */
  dayStreak: number;
  lastPlayDate: string;
  /** ბოლო აქტივობა (მასწავლებლის პანელისთვის). */
  lastActive: string | null;
  /** წინა დღეს რა ამოიწურა (დილით საწყობში მინიშნებისთვის). */
  lastStockouts?: string[];
  badges: string[];
  history: DayRecord[];
  /** read — ტექსტის ავტომატური ხმით კითხვა (ნაგულისხმევად 1 კლასში ჩართულია). */
  settings: { sound: boolean; read?: boolean; music?: boolean }; // music: ფონური მელოდია (ნაგულისხმევად ჩართულია)
  /** პირველი სამუშაო დღის სწავლება ნანახია (ან გამოტოვებულია). */
  tutorialDone?: boolean;
  lastBought?: string;
  lastPrep?: string;            // გუშინდელი დილის ამოცანის სახეობა (ზედიზედ რომ არ განმეორდეს)
  cafeName?: string;           // კაფეს სახელი (ბავშვმა დაარქვა; ცარიელი — „ჩემი ბურგერების კაფე")
}

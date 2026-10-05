// კაფეს განლაგება თითოეულ დონეზე (კოორდინატები ფილებში, 1 ფილა = 48 ერთეული).
// x → მარჯვენა კედლის გასწვრივ, y → მარცხენა კედლის გასწვრივ (მაყურებლისკენ).
//
// ზონები:
//  * უკანა ზონა (y < დახლი): სტუმრები დახლთან, უკანა კედელთან — მცენარეები, მუსიკა;
//  * დახლი: მარცხნივ — სასმელის აპარატი, მარჯვნივ — სალარო;
//  * სამზარეულო (დახლის წინ): მზარეული, ხაზი: გრილი → გრილი → ფრის ქვაბი → ნაყინი;
//    ქურა ქვაბებით — წინა-მარცხენა კუთხეში მარცხენა კედელთან;
//  * დარბაზი (დახლის მარჯვნივ): მაგიდები ერთ სვეტად, დიდი მცენარეები მათ შორის.
// წესი: არცერთი ნივთი არ ფარავს მეორეს და არ დგას კარის/სტუმრების წინ.

export interface Pos { x: number; y: number; z?: number }
export interface WallPos { wall: 'left' | 'right'; at: number }

export interface LevelLayout {
  counter: Pos;
  spots: Pos[];              // სად დგანან კლიენტები დახლთან
  chef: Pos;
  door: WallPos;
  windows: WallPos[];
  cash: Pos;                 // სალარო დახლზე (z = დახლის სიმაღლე)
  /** დონის საკუთარი დეკორი (მაგ. ნეონის აბრა დიდ რესტორანში). */
  extras?: { key: string; at: WallPos; zTop: number }[];
  /** ნივთის id → ადგილები (რამდენიც ეგზემპლარი შეიძლება) */
  slots: Record<string, (Pos | WallPos)[]>;
}

const COUNTER_TOP = 70;

/**
 * სამზარეულოს ხაზი დახლის წინ, მარცხნიდან მარჯვნივ:
 * ქურა ქვაბებით → ფრის ქვაბი → (ნაყინი) → გრილი → მეორე გრილი (ხაზის ბოლოში).
 */
const kitchen = (y: number, withIce: boolean): Record<string, Pos[]> => {
  const ice = withIce ? 1.25 : 0;
  return {
    stove: [{ x: 0.3, y: y + 0.3 }],
    fryer: [{ x: 2.15, y: y + 0.3 }],
    ...(withIce ? { iceCream: [{ x: 3.65, y: y + 0.4 }] } : {}),
    grill1: [{ x: 3.65 + ice, y }],
    grill2: [{ x: 5.85 + ice, y }],
  };
};

export const LAYOUTS: Record<number, LevelLayout> = {
  1: {
    counter: { x: 0.5, y: 3 },
    spots: [{ x: 2.4, y: 1.9 }, { x: 3.9, y: 1.9 }, { x: 5.4, y: 1.9 }],
    chef: { x: 4.5, y: 4.35 },
    door: { wall: 'left', at: 0.6 },
    windows: [{ wall: 'right', at: 1 }, { wall: 'right', at: 3.9 }],
    cash: { x: 5.5, y: 3.15, z: COUNTER_TOP },
    slots: {
      ...kitchen(5.1, false),
      drinkBasic: [{ x: 0.75, y: 3.06, z: COUNTER_TOP }],
      plantStarter: [{ x: 6.75, y: 0.2 }],
      plant: [{ x: 1.0, y: 0.2 }, { x: 10.15, y: 0.2 }],
      picture: [{ wall: 'right', at: 6.9 }, { wall: 'right', at: 8.9 }],
      table: [{ x: 8.7, y: 1.1 }, { x: 8.7, y: 3.4 }, { x: 8.7, y: 5.7 }],
    },
  },
  2: {
    counter: { x: 0.5, y: 3 },
    spots: [{ x: 2.3, y: 1.9 }, { x: 3.7, y: 1.9 }, { x: 5.1, y: 1.9 }, { x: 6.5, y: 1.9 }],
    chef: { x: 4.5, y: 4.35 },
    door: { wall: 'left', at: 0.6 },
    windows: [{ wall: 'right', at: 1 }, { wall: 'right', at: 4 }],
    cash: { x: 6.5, y: 3.15, z: COUNTER_TOP },
    slots: {
      ...kitchen(5.1, false),
      drinkBasic: [{ x: 0.75, y: 3.06, z: COUNTER_TOP }],
      plantStarter: [{ x: 7.75, y: 0.2 }],
      jukebox: [{ x: 8.8, y: 0.2 }],
      plant: [{ x: 1.0, y: 0.2 }, { x: 11.1, y: 0.2 }],
      plantBig: [{ x: 3.4, y: 0.15 }, { x: 9.85, y: 0.15 }],
      picture: [{ wall: 'right', at: 7.1 }, { wall: 'right', at: 10.2 }],
      table: [{ x: 9.8, y: 1.3 }, { x: 9.8, y: 3.6 }, { x: 9.8, y: 5.9 }],
    },
  },
  3: {
    counter: { x: 0.5, y: 3.2 },
    spots: [{ x: 2.3, y: 2 }, { x: 3.9, y: 2 }, { x: 5.5, y: 2 }, { x: 7.1, y: 2 }],
    chef: { x: 5.7, y: 4.6 },
    door: { wall: 'left', at: 0.6 },
    windows: [{ wall: 'right', at: 1 }, { wall: 'right', at: 4 }, { wall: 'left', at: 4.8 }],
    cash: { x: 7.45, y: 3.35, z: COUNTER_TOP },
    slots: {
      ...kitchen(5.4, true),
      drinkBasic: [{ x: 0.75, y: 3.26, z: COUNTER_TOP }],
      plantStarter: [{ x: 8.75, y: 0.2 }],
      jukebox: [{ x: 9.8, y: 0.2 }],
      plant: [{ x: 1.0, y: 0.2 }, { x: 12.1, y: 0.2 }],
      plantBig: [{ x: 3.4, y: 0.15 }, { x: 10.85, y: 0.15 }],
      picture: [{ wall: 'right', at: 7.6 }, { wall: 'right', at: 11.1 }],
      table: [{ x: 10.8, y: 1.4 }, { x: 10.8, y: 3.8 }, { x: 10.8, y: 6.2 }],
    },
  },
};
// დიდი რესტორანი: იგივე განლაგება, კედელზე ნეონის აბრა (სურათები მარჯვნივ გადადის)
LAYOUTS[4] = {
  ...LAYOUTS[3],
  extras: [{ key: 'neon_sign', at: { wall: 'right', at: 6.35 }, zTop: 205 }],
  slots: { ...LAYOUTS[3].slots, picture: [{ wall: 'right', at: 9.1 }, { wall: 'right', at: 11.1 }] },
};

/** ნივთები, რომლებიც სხვას ცვლიან იმავე ადგილზე (ვიზუალურად). */
export const REPLACES: Record<string, { slot: string; key: string }> = {
  grillFast: { slot: 'grill1', key: 'grill_fast' },
  drinkAuto: { slot: 'drinkBasic', key: 'drink_machine_auto' },
  cashRegister: { slot: 'cash', key: 'cash_register' },
};

export const isWall = (p: Pos | WallPos): p is WallPos => 'wall' in p;

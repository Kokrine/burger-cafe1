// კაფეს იზომეტრიული სცენა. ოთახს და ყველა ნაყიდ ნივთს აწყობს პროგრესიდან
// და თავიდან ხატავს ყოველი ცვლილებისას (ყიდვა, დონე, მზარეული).
import Phaser from 'phaser';
import tokens from '../../design/tokens.json';
import { assetUrl, chefKey, CUSTOMER_IDS, getManifest, type AssetEntry } from '../../core/assets';
import { store } from '../../core/store';
import { bus } from '../../core/bus';
import type { Progress } from '../../core/types';
import { CAFE_LEVELS, ITEMS, type CafeLevel } from '../../config/economy';
import { isWall, LAYOUTS, REPLACES, type Pos, type WallPos } from '../../config/layout';
import { R, VIEW, visibleSize } from '../game';

const T = tokens.iso.tile;
const WALL_H = 220;
import { DEFAULT_CHEF } from './BootScene';
import { reducedMotion } from '../../ui/fx';

/** ფენების რიგი: იატაკი → კედლები → კედლის დეკორი → ობიექტები (y-ით დალაგებული). */
const DEPTH = { floor: 0, wall: 1, wallDecor: 2, objects: 10 };

export class CafeScene extends Phaser.Scene {
  protected layer!: Phaser.GameObjects.Layer;
  protected bg!: Phaser.GameObjects.Graphics;
  protected ox = 0;
  protected oy = 0;
  protected positions = new Map<string, [number, number]>();
  /** ოთახის ზომა და განლაგება (ServiceScene-ისთვის). */
  protected room = { W: 0, D: 0, layout: LAYOUTS[1] };
  protected chefImg?: Phaser.GameObjects.Image;
  /** მთავარ მენიუში კლიენტები უბრალოდ დგანან დახლთან. */
  protected idleCustomers = true;
  private customers: string[] = [];
  private renderKey = '';

  constructor(key = 'cafe') {
    super(key);
  }

  create() {
    this.renderKey = '';
    this.drawBackground();
    this.layer = this.add.layer();
    this.setupCameras();
    // dev: ?showcase=3 — კაფე ყველა ნივთით (შენახვას არ ეხება), განლაგების შესამოწმებლად
    const showcase = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('showcase')) : 0;
    if (showcase && this.idleCustomers) {
      const p = { ...store.get(), cafeLevel: showcase, owned: Object.fromEntries(ITEMS.map((i) => [i.id, i.max])) };
      void this.rebuild(p);
      return;
    }
    void this.rebuild(store.get());
    const unsub = store.subscribe((p) => void this.rebuild(p));
    const onBought = (id: string) => this.celebrate(id);
    bus.on('bought', onBought);
    this.events.once('shutdown', () => {
      unsub();
      bus.off('bought', onBought);
    });
  }

  protected setupCameras() {
    const cam = this.cameras.main;
    cam.setZoom(R);
    cam.centerOn(VIEW.w / 2, VIEW.h / 2);
    cam.fadeIn(450, 255, 231, 184);
    // ეკრანის ზომის/ორიენტაციის ცვლილება — კამერები თავიდან ლაგდება
    const onResize = () => this.layoutCameras();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  /** კამერის ზომა = ეკრანის ზომა; მენიუში — ოთახი მთელ ეკრანზე. */
  protected layoutCameras() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    if (this.idleCustomers) this.fitMenuRoom();
  }

  /** მთავარი მენიუ: ოთახი ეკრანის მეტ ნაწილს იკავებს (ზემოთ HUD-ის, ქვემოთ ღილაკების ადგილი რჩება). */
  private fitMenuRoom() {
    if (!this.room.W) return;
    const { W, D } = this.room;
    const { w, h } = visibleSize(this.scale);
    const minX = this.ox - D * T - 10, maxX = this.ox + W * T + 10;
    const minY = this.oy - WALL_H - 10, maxY = this.oy + ((W + D) * T) / 2 + 6;
    const f = Math.min(1.9, (w * 0.9) / (maxX - minX), (h * 0.96) / (maxY - minY));
    this.cameras.main.setZoom(R * f).centerOn((minX + maxX) / 2, (minY + maxY) / 2);
  }

  /** ოთახის აწყობის შემდეგ (ქვეკლასებისთვის). */
  protected afterBuild(_p: Progress) {}

  // ---------------- აწყობა ----------------

  private async rebuild(p: Progress) {
    const chef = p.chef ? chefKey(p.chef) : DEFAULT_CHEF;
    const key = JSON.stringify([p.cafeLevel, p.owned, chef]);
    if (key === this.renderKey) return;
    this.renderKey = key;
    await this.ensure([chef]);
    this.layer.removeAll(true);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.positions.clear();

    const level = Math.min(4, Math.max(1, p.cafeLevel)) as CafeLevel;
    const conf = CAFE_LEVELS[level];
    const L = LAYOUTS[level];
    const [W, D] = conf.room;
    this.room = { W, D, layout: L };

    // ოთახის ცენტრირება ეკრანზე (ზემოთ HUD-ის, ქვემოთ მენიუს ადგილი რჩება)
    const totalH = WALL_H + 20 + ((W + D) * T) / 2;
    this.ox = VIEW.w / 2 - ((W - D) * T) / 2;
    this.oy = 470 - totalH / 2 + WALL_H + 20;

    // იატაკი და კედლები
    for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
      this.place(`floor_l${level}_${(i + j) % 2 ? 'b' : 'a'}`, i * T, j * T, 0, DEPTH.floor);
    }
    for (let i = 0; i < W; i++) this.place(`wall_l${level}_right`, i * T, 0, 0, DEPTH.wall);
    for (let j = 0; j < D; j++) this.place(`wall_l${level}_left`, 0, j * T, 0, DEPTH.wall);
    for (const w of L.windows) this.placeWall('window_right', w, 196);
    this.placeWall('door_right', L.door, 150);
    for (const x of L.extras ?? []) this.placeWall(x.key, x.at, x.zTop);

    // დახლი
    const cKey = `counter_${conf.counter}`;
    const cm = this.entry(cKey);
    this.placeObj(cKey, L.counter, cm);
    const cashKey = p.owned.cashRegister ? 'cash_register' : 'cash_box';
    this.placeObj(cashKey, { ...L.cash, z: cm.height ?? 70 }, this.entry(cashKey), 2, p.owned.cashRegister ? 'cashRegister' : undefined);

    // ნაყიდი ნივთები თავიანთ ადგილებზე
    for (const [id, slots] of Object.entries(L.slots)) {
      const count = Math.min(p.owned[id] ?? 0, slots.length);
      for (let k = 0; k < count; k++) {
        const pos = slots[k];
        let tex = this.textureFor(id);
        const rep = Object.entries(REPLACES).find(([rid, r]) => r.slot === id && p.owned[rid]);
        if (rep) tex = rep[1].key;
        const tag = rep ? rep[0] : id;
        if (isWall(pos)) this.placeWall(tex, pos, 170, tag);
        else {
          const obj = this.placeObj(tex, pos, this.entry(tex), 0, tag);
          if (id.startsWith('plant')) this.sway(obj);
          if (id === 'jukebox') this.notes(obj);
        }
        if (id === 'stove' && !isWall(pos)) this.steam(tex, pos);
      }
    }

    // მზარეული და კლიენტები
    this.chefImg = this.bob(this.placeObj(chef, L.chef, this.entry(chef)), 3, 1400);
    if (!this.idleCustomers) { this.afterBuild(p); return; }
    this.layoutCameras();
    if (this.customers.length !== L.spots.length) {
      this.customers = Phaser.Utils.Array.Shuffle([...CUSTOMER_IDS]).slice(0, L.spots.length);
    }
    L.spots.forEach((s, i) => {
      const mood = i % 3 === 2 ? 'neutral' : 'happy';
      const img = this.placeObj(`customer_${this.customers[i]}_${mood}`, s, this.entry(`customer_${this.customers[i]}_${mood}`));
      this.bob(img, 4, 900 + i * 170);
    });
  }

  private textureFor(id: string): string {
    const map: Record<string, string> = {
      grill1: 'grill', grill2: 'grill', drinkBasic: 'drink_machine', stove: 'stove_pots', fryer: 'fryer',
      iceCream: 'ice_cream_machine', plantStarter: 'plant', plant: 'plant', plantBig: 'plant_big',
      picture: 'picture_right', table: 'table_set', jukebox: 'jukebox',
    };
    return map[id] ?? id;
  }

  // ---------------- დამხმარეები ----------------

  protected entry(key: string): AssetEntry {
    return getManifest()[key];
  }

  protected iso(x: number, y: number, z = 0): [number, number] {
    return [this.ox + x - y, this.oy + (x + y) / 2 - z];
  }

  protected place(key: string, wx: number, wy: number, wz: number, depth: number, flip = false) {
    const e = this.entry(key);
    const [sx, sy] = this.iso(wx, wy, wz);
    const ax = flip ? e.w - e.anchor[0] : e.anchor[0];
    const img = this.add.image(sx, sy, key).setScale(1 / R).setOrigin(ax / e.w, e.anchor[1] / e.h).setFlipX(flip).setDepth(depth);
    this.layer.add(img);
    return img;
  }

  /** იატაკზე მდგომი ობიექტი — სიღრმე ნაკვალევის წინა კიდით. */
  protected placeObj(key: string, pos: Pos, e: AssetEntry, bias = 0, tag?: string) {
    const [fw, fd] = e.footprint ?? [0, 0];
    const x = pos.x * T, y = pos.y * T;
    // დახლზე მდგომი ნივთი დახლის ზემოთ ჩანს, მაგრამ მის წინ მდგომი მზარეულის უკან
    const onCounter = (pos.z ?? 0) > 0;
    const yFront = onCounter ? this.room.layout.counter.y * T + 48 + 0.5 : y + fd;
    const depth = DEPTH.objects + yFront + (x + fw) * 0.001 + bias;
    const img = this.place(key, x, y, pos.z ?? 0, depth);
    if (tag) this.positions.set(tag, this.iso(x + fw / 2, y + fd / 2, (pos.z ?? 0) + (e.height ?? 40)));
    return img;
  }

  /** კედელზე დაკიდებული — მარჯვენა კედლის ასეტი მარცხენაზე სარკისებურად ბრუნდება. */
  private placeWall(key: string, w: WallPos, zTop: number, tag?: string) {
    const img = w.wall === 'right'
      ? this.place(key, w.at * T, 0, zTop, DEPTH.wallDecor)
      : this.place(key, 0, w.at * T, zTop, DEPTH.wallDecor, true);
    if (tag) this.positions.set(tag, [img.x, img.y + 40]);
    return img;
  }

  /** მცენარე ოდნავ ირხევა. */
  protected sway(img: Phaser.GameObjects.Image) {
    if (reducedMotion()) return;
    this.tweens.add({ targets: img, angle: { from: -1.5, to: 1.5 }, duration: 1800 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** მუსიკალური ავტომატიდან ნოტები ამოდის. */
  protected notes(img: Phaser.GameObjects.Image) {
    if (reducedMotion()) return;
    const colors = ['#FF6B9E', '#2EC4B6', '#FF8A3D', '#5CBF58'];
    this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        const n = this.add.text(img.x + Phaser.Math.Between(-14, 14), img.y - 150, Math.random() < 0.5 ? '♪' : '♫', {
          fontSize: '30px', fontStyle: '900', color: colors[Phaser.Math.Between(0, 3)], stroke: '#2B1810', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(900).setResolution(R);
        this.layer.add(n);
        this.tweens.add({ targets: n, y: n.y - 70, x: n.x + Phaser.Math.Between(-20, 20), alpha: 0, angle: Phaser.Math.Between(-20, 20), duration: 1800, ease: 'Sine.out', onComplete: () => n.destroy() });
      },
    });
  }

  protected bob(img: Phaser.GameObjects.Image, amp: number, dur: number) {
    if (reducedMotion()) return img;
    this.tweens.add({ targets: img, y: img.y - amp, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 600 });
    return img;
  }

  private steam(key: string, pos: Pos) {
    const e = this.entry(key);
    const [ax, ay] = this.iso(pos.x * T, pos.y * T);
    for (const [dx, dy] of e.steam ?? []) {
      for (let k = 0; k < 3; k++) {
        const puff = this.add.circle(ax + dx, ay + dy, 7, 0xffffff, 0.75).setDepth(500);
        this.layer.add(puff);
        this.tweens.add({
          targets: puff, y: ay + dy - 40, scale: 1.8, alpha: 0, duration: 1800, delay: k * 600, repeat: -1, ease: 'Sine.out',
          onRepeat: () => puff.setPosition(ax + dx + Phaser.Math.Between(-4, 4), ay + dy),
        });
      }
    }
  }

  /** ახალი ნივთის ზეიმი: ვარსკვლავების აფეთქება მის ადგილზე. */
  private celebrate(id: string) {
    this.time.delayedCall(80, () => {
      const pos = this.positions.get(id) ?? (id.startsWith('level') || id === 'branch2' ? [VIEW.w / 2, VIEW.h / 2] as [number, number] : undefined);
      if (!pos) return;
      const [x, y] = pos;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const star = this.add.image(x, y, i % 2 ? 'star' : 'icon_sparkle').setScale(0.2 / R).setDepth(2000);
        this.tweens.add({
          targets: star, x: x + Math.cos(a) * 110, y: y + Math.sin(a) * 70 - 30, scale: (i % 2 ? 0.55 : 0.75) / R, alpha: 0, angle: 180,
          duration: 1000, ease: 'Cubic.out', onComplete: () => star.destroy(),
        });
      }
    });
  }

  protected async ensure(keys: string[]) {
    const missing = keys.filter((k) => !this.textures.exists(k));
    if (!missing.length) return;
    for (const k of missing) this.load.svg(k, assetUrl(k), { scale: R });
    await new Promise<void>((res) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => res());
      this.load.start();
    });
  }

  private drawBackground() {
    const g = (this.bg = this.add.graphics().setDepth(-10));
    const top = Phaser.Display.Color.HexStringToColor(tokens.color.bgTop).color;
    const bot = Phaser.Display.Color.HexStringToColor(tokens.color.bgBottom).color;
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(-VIEW.w, -VIEW.h, VIEW.w * 3, VIEW.h * 3); // EXPAND: ხილული არე 1600×900-ზე დიდი შეიძლება იყოს
    // რბილი წრეები ფონზე
    for (let i = 0; i < 9; i++) {
      g.fillStyle(0xffffff, 0.12);
      g.fillCircle(Phaser.Math.Between(0, VIEW.w), Phaser.Math.Between(0, VIEW.h), Phaser.Math.Between(40, 120));
    }
  }
}

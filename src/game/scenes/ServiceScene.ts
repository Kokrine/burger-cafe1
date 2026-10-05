// სამუშაო დღე: ზემოთ — კაფე (სტუმრები შემოდიან, შეკვეთა ბუშტში, მოთმინება),
// ქვემოთ — სამზარეულოს მაგიდა (ყუთები, გრილი, თეფში, აპარატები).
// ორი კამერა: ოთახის (დაპატარავებული) და მაგიდის (სრული ზომით).
import Phaser from 'phaser';
import tokens from '../../design/tokens.json';
import { CafeScene } from './CafeScene';
import { R, VIEW, visibleSize } from '../game';
import { CUSTOMER_IDS, getManifest, type CustomerId } from '../../core/assets';
import { store } from '../../core/store';
import { bus } from '../../core/bus';
import { setSession } from '../../core/session';
import type { Grade, Mood, Progress } from '../../core/types';
import { GRADE_SCALE, PRODUCTS, SIDE_STOCK, STOCK, type StockId } from '../../config/economy';
import { EMERGENCY, INGREDIENTS, SERVICE, type Ingredient, type Layer, type Side } from '../../config/service';
import { cafeStats, type CafeStats } from '../../logic/economy';
import { burgerDone, canAdd, canMake, layerFor, makeFeasibleOrder, matches, usedIngredients, type Order } from '../../logic/orders';
import { askStockout } from '../../ui/stockoutModal';
import { cashierPlan } from '../../logic/cashier';
import { buyEmergency, closeService, consume, dayGoal, ensureToday, neededStock, noteStockout, receiveDelivery, recordSale } from '../../logic/day';
import { prepProblem, sideQtyMax } from '../../logic/math/generator';
import { S, t } from '../../i18n/strings.ka';
import { play, startMusic, stopMusic } from '../../audio/sfx';
import { banner, flyCoins, reducedMotion } from '../../ui/fx';
import { isBlockedPortrait } from '../../ui/orientation';
import { askProblem } from '../../ui/mathModal';
import { layers, toast } from '../../ui/layers';
import { h } from '../../ui/dom';
import { autoRead, speakButton } from '../../ui/speak';
import { speak, stopSpeech } from '../../audio/speech';

const T = tokens.iso.tile;
const BENCH_Y = 570;
const FONT = tokens.font.family.replace(/'/g, '');
const ROOM_TOP = 70, ROOM_H = 500;
// მაგიდის განლაგება (UI კოორდინატები): ყუთები მარცხნივ → გრილი შუაში → თეფში წინ (აწყობა)
// → მზა გვერდითი კერძები თეფშის მარჯვნივ → ნაგავი. აპარატები უკანა რიგში, თითო ცალკე.
const GRILL_X = 790, GRILL_Y = 892;
const PLATE_X = 1110, PLATE_Y = 856;
const TRAY_X = 1300, TRAY_Y = 840;
const MACH_Y = 752;

type Img = Phaser.GameObjects.Image;

interface GrillSlot { x: number; y: number; state: 'empty' | 'cooking' | 'ready' | 'burnt'; t: number; img?: Img; puffs: Phaser.GameObjects.Arc[] }
interface Machine {
  side: Side; x: number; top: number; state: 'idle' | 'working' | 'ready'; t: number; dur: number; img: Img; bar: Phaser.GameObjects.Graphics; product?: Img;
  /** სად ჩნდება მზა პროდუქტი (ჭიქა ონკანის ქვეშ…) და საიდან ისხმება (ონკანი) */
  out: [number, number]; spout?: [number, number];
}
interface Cust {
  id: CustomerId; order: Order; spot: number; img: Img;
  state: 'walk' | 'wait' | 'pay' | 'leave';
  from: [number, number]; to: [number, number]; walkT: number; walkDur: number;
  patience: number; max: number; mood: Mood;
  bubble: Phaser.GameObjects.GameObject[]; bar?: Phaser.GameObjects.Graphics; tail?: Phaser.GameObjects.Graphics;
  soldOut?: boolean; soldTag?: Phaser.GameObjects.Text;
}

type TutStep = 'wait' | 'look' | 'build' | 'serve' | 'cash' | 'done';
type Tut = { step: TutStep; t: number; said: string; cust?: Cust };

export interface DaySummary { day: number; served: number; left: number; revenue: number; tips: number; goal: number }

export class ServiceScene extends CafeScene {
  protected idleCustomers = false;
  private ui!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private z = 0.7;
  private benchImg?: Img;
  private camCenter: [number, number] = [0, 0];

  private stats!: CafeStats;
  private grade: Grade = 2;
  private plate: Layer[] = [];
  private plateImgs: Img[] = [];
  private tray: Side[] = [];
  private trayImgs: Img[] = [];
  private trayTexts: Phaser.GameObjects.Text[] = [];
  private binBadges = new Map<Ingredient, Phaser.GameObjects.Text>();
  private deliveries: { id: StockId; packs: number; t: number; parts: Phaser.GameObjects.GameObject[]; label: Phaser.GameObjects.Text }[] = [];
  private prompted = new Set<StockId>();
  private closing = false;
  private missed = 0;
  private grills: GrillSlot[] = [];
  private machines: Machine[] = [];
  private custs: Cust[] = [];
  private pauses = new Set<string>();
  private spawned = 0;
  private total = 0;
  private served = 0;
  private left = 0;
  private revenue = 0;
  private tips = 0;
  private goal = 0;
  private sinceSpawn = 0;
  private elapsed = 0;
  private clockTick = 0;
  private ended = false;
  private built = false;
  /** სამუშაო საათები [გახსნა, დახურვა] — იგივე, რაც დილის ამოცანაში. */
  private hours: [number, number] = [SERVICE.openHour, SERVICE.closeHour];
  // პირველი დღის სწავლება
  private tut: Tut | null = null;
  private tutPtr?: Phaser.GameObjects.Container;
  private coach?: HTMLElement;
  private binAt = new Map<Ingredient, [number, number]>();

  constructor() {
    super('service');
  }

  /** სცენა ყოველ დღეს თავიდან იწყება — მდგომარეობა ნულდება. */
  init() {
    this.plate = []; this.plateImgs = []; this.tray = []; this.trayImgs = []; this.trayTexts = [];
    this.grills = []; this.machines = []; this.custs = []; this.pauses = new Set();
    this.spawned = this.total = this.served = this.left = this.revenue = this.tips = this.goal = 0;
    this.sinceSpawn = this.elapsed = this.clockTick = 0;
    this.ended = false;
    this.binBadges = new Map();
    this.deliveries = [];
    this.prompted = new Set();
    this.closing = false;
    this.missed = 0;
    this.built = false;
    this.tut = null;
    this.tutPtr = undefined;
    this.coach = undefined;
    this.binAt = new Map();
  }

  protected setupCameras() {
    super.setupCameras();
    this.ui = this.add.layer().setDepth(1000);
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setZoom(R).centerOn(VIEW.w / 2, VIEW.h / 2);
    this.events.once('shutdown', () => { this.benchImg = undefined; });
    this.uiCam.ignore([this.layer, this.bg] as Phaser.GameObjects.GameObject[]);
    this.cameras.main.ignore(this.ui);
    this.cameras.main.setBackgroundColor(tokens.color.bgTop);
    const onPause = (on: boolean) => (on ? this.pauses.add('menu') : this.pauses.delete('menu'));
    bus.on('pause', onPause);
    // ტელეფონი ვერტიკალურად მოატრიალეს — თამაში ჩერდება
    const onRotate = (on: boolean) => (on ? this.pauses.add('rotate') : this.pauses.delete('rotate'));
    bus.on('rotate', onRotate);
    if (isBlockedPortrait()) this.pauses.add('rotate');
    this.events.once('shutdown', () => {
      bus.off('pause', onPause);
      bus.off('rotate', onRotate);
      setSession({ active: false });
      stopMusic();
    });
    this.cameras.main.fadeIn(450, 255, 231, 184);
    this.uiCam.fadeIn(450, 255, 231, 184);
  }

  protected afterBuild(p: Progress) {
    if (this.built) return;
    this.built = true;
    this.stats = cafeStats(p);
    this.grade = p.today?.grade ?? p.grade; // დღის ფასები იმ კლასისაა, რომლითაც დღე დაიწყო
    this.hours = p.today?.hours ?? [SERVICE.openHour, SERVICE.closeHour];
    this.fitRoom();
    this.buildBench(p);
    // გვერდის გადატვირთვის/გასვლის შემდეგ იგივე დღე გრძელდება — უკვე მოსული კლიენტები აღარ მოდიან
    this.total = p.today?.closed ? 0 : Math.max(0, this.stats.customersPerDay - (p.today?.seen ?? 0));
    this.goal = p.today?.goal ?? dayGoal(p);
    this.sinceSpawn = SERVICE.spawnEvery - SERVICE.firstSpawn;
    setSession({ active: true, goal: this.goal, earned: 0, clock: this.clockText(0) });
    // პირველი სამუშაო დღე — ნაბიჯ-ნაბიჯ სწავლება (ერთხელ)
    if (!p.tutorialDone) this.tut = { step: 'wait', t: 0, said: '' };
    // პაუზის მენიუდან „სწავლების თავიდან ნახვა" — დღის შუაშიც
    const onTutorial = () => { if (!this.tut && !this.ended) this.tut = { step: 'wait', t: 0, said: '' }; };
    bus.on('tutorial', onTutorial);
    document.body.classList.add('in-service');
    this.events.once('shutdown', () => {
      bus.off('tutorial', onTutorial);
      this.coach?.remove();
      this.coach = undefined;
      stopSpeech();
      document.body.classList.remove('in-service');
    });
    void this.prep(p);
    if (p.owned.jukebox) startMusic();
  }

  /** დილის მომზადება (2+ კლასი): 12 კოტლეტი 4 თეფშზე თანაბრად. */
  private async prep(p: Progress) {
    // გაგრძელებულ დღეზე (გვერდის გადატვირთვის შემდეგ) მომზადება უკვე გაკეთებულია
    // სახეობა კლასის მიხედვით: გაყოფა თეფშებზე, საათები, კოტლეტის წუთები, წილადები
    const lv = (op: 'add' | 'sub' | 'mul' | 'div') => p.adaptive?.[op].level ?? 2;
    const pr = (p.today?.seen ?? 0) > 0 ? null
      : prepProblem(this.grade, { add: lv('add'), sub: lv('sub'), mul: lv('mul'), div: lv('div') }, Math.random, this.hours, p.lastPrep);
    if (pr) {
      store.update((q) => { q.lastPrep = pr.kind; });
      this.pauses.add('prep');
      await askProblem(S.service.prepTitle, pr, { cancellable: false });
      this.pauses.delete('prep');
    }
    banner(S.service.openSign, 'icon_store', 'open');
  }

  // ---------------- განლაგება ----------------

  /** ეკრანის ზომა შეიცვალა: ორივე კამერა ეკრანის ზომისაა, ოთახი და მაგიდა თავიდან ლაგდება. */
  protected layoutCameras() {
    super.layoutCameras();
    if (!this.uiCam) return;
    this.uiCam.setSize(this.scale.width, this.scale.height).centerOn(VIEW.w / 2, VIEW.h / 2);
    if (this.built) this.fitRoom();
    this.stretchBench();
  }

  /** მაგიდის ფონი ხილული არის მთელ სიგანეზე (EXPAND-ით ეკრანი 1600-ზე განიერი შეიძლება იყოს). */
  private stretchBench() {
    const img = this.benchImg;
    if (!img) return;
    const { w } = visibleSize(this.scale);
    const width = Math.max(VIEW.w, w + 4);
    img.setX(VIEW.w / 2 - width / 2).setScale((width / VIEW.w) / R, 1 / R);
  }

  /**
   * შეტყობინებები და სწავლების ყუთი — მაგიდის ზემოთ, ოთახის იატაკზე (ზემოთ კლიენტების ბუშტებია,
   * ბავშვმა შეკვეთა ყოველთვის უნდა დაინახოს). CSS ცვლადები: app.css → .in-service.
   */
  private placeOverlays() {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const k = canvas.width / rect.width;
    const benchTop = rect.top + (canvas.height / 2 + (BENCH_Y - VIEW.h / 2) * R) / k;
    const css = document.documentElement.style;
    css.setProperty('--above-bench', `${Math.round(Math.max(0, window.innerHeight - benchTop) + 8)}px`);
    css.setProperty('--coach-h', `${this.coach?.offsetHeight ?? 0}px`);
  }

  private fitRoom() {
    this.placeOverlays();
    // ოთახის სილუეტი მაგიდის ზემოთ, HUD-ის ელემენტების გარეშე (იატაკის წინა წვერო მაგიდის ქვეშ შეიძლება შევიდეს)
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width) {
      const k = canvas.width / rect.width;
      const benchTop = rect.top + (canvas.height / 2 + (BENCH_Y - VIEW.h / 2) * R) / k;
      const fitted = this.fitOutline(
        { x0: rect.left + 6, y0: rect.top + 4, x1: rect.right - 6, y1: benchTop + (benchTop - rect.top) * 0.08 },
        ['.hud-left > *', '.hud-right > *'], R * 1.25, 215);
      if (fitted) {
        this.z = fitted.zoom / R;
        this.camCenter = fitted.center;
        this.cameras.main.setZoom(fitted.zoom).centerOn(this.camCenter[0], this.camCenter[1]);
        return;
      }
    }
    const { W, D } = this.room;
    const minX = this.ox - D * T, maxX = this.ox + W * T;
    // იატაკის წინა წვერო მაგიდის ქვეშ შეიძლება მოექცეს — ოთახი უფრო დიდი ჩანს
    const minY = this.oy - 215, maxY = this.oy + ((W + D) * T) / 2 - 80;
    const { w } = visibleSize(this.scale);
    this.z = Math.min(1, (ROOM_H + 30) / (maxY - minY), (w - 100) / (maxX - minX));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    this.camCenter = [cx, cy + (VIEW.h / 2 - (ROOM_TOP + ROOM_H / 2)) / this.z];
    this.cameras.main.setZoom(R * this.z).centerOn(this.camCenter[0], this.camCenter[1]);
  }

  /** ოთახის (world) წერტილი → მაგიდის ფენის (ეკრანის) კოორდინატი. */
  private toUi(wx: number, wy: number): [number, number] {
    return [VIEW.w / 2 + (wx - this.camCenter[0]) * this.z, VIEW.h / 2 + (wy - this.camCenter[1]) * this.z];
  }

  private addUi<G extends Phaser.GameObjects.GameObject>(o: G): G {
    this.ui.add(o);
    this.cameras.main.ignore(o);
    return o;
  }

  private uimg(key: string, x: number, y: number, scale = 1, ox = 0.5, oy = 0.5): Img {
    return this.addUi(this.add.image(x, y, key).setScale(scale / R).setOrigin(ox, oy));
  }

  private text(x: number, y: number, s: string, size = 18, color = tokens.color.ink) {
    return this.addUi(this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '800', color, align: 'center' }).setOrigin(0.5).setResolution(R));
  }

  private buildBench(p: Progress) {
    this.benchImg = this.uimg('workbench', 0, BENCH_Y, 1, 0, 0).setDepth(0);
    this.stretchBench();
    const used = usedIngredients(p.menu);

    // ინგრედიენტების ყუთები: 2 რიგი × 4
    INGREDIENTS.forEach((ing, i) => {
      const x = 84 + (i % 4) * 146, y = i < 4 ? 726 : 886;
      const on = used.has(ing);
      const box = this.uimg('bin', x, y, 1.16, 0.5, 1).setDepth(1);
      const key = ing === 'bun' ? 'layer_bun_top' : `layer_${ing}`;
      const icon = this.uimg(key, x, y - 76, ing === 'bun' ? 0.74 : 0.86).setDepth(2);
      this.binAt.set(ing, [x, y - 70]);
      const label = this.text(x, y - 25, S.service.binNames[ing] ?? S.ingredients[ing], 22, '#ffffff').setDepth(3).setStroke(tokens.color.tealDark, 6);
      if (!on) { box.setAlpha(0.35); icon.setAlpha(0.35); label.setAlpha(0.5); return; }
      // მარაგის რაოდენობა ყუთის კუთხეში
      this.binBadges.set(ing, this.text(x + 48, y - 100, '', 26).setDepth(4).setStroke('#ffffff', 7));
      box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onBin(ing, box));
    });

    this.updateBadges();

    // გრილ(ებ)ი
    // მეორე გრილი = ერთი ფართო გრილი 8 ადგილით (2 რიგი × 4), წინიდან დახატული
    const gKey = `bench_grill${p.owned.grill2 ? '_big' : ''}${p.owned.grillFast ? '_fast' : ''}`;
    const e = getManifest()[gKey];
    const s = p.owned.grill2 ? 1 : 1.15;
    {
      const gx = GRILL_X, gy = GRILL_Y;
      this.uimg(gKey, gx, gy, s, 0.5, 1).setDepth(1);
      const left = gx - (e.w * s) / 2, top = gy - e.h * s;
      const own: GrillSlot[] = [];
      for (const [dx, dy] of e.slots ?? []) {
        const slot: GrillSlot = { x: left + dx * s, y: top + dy * s, state: 'empty', t: 0, puffs: [] };
        this.grills.push(slot);
        own.push(slot);
      }
      // ერთი შეხების არე მთელ გრილზე: ადგილები ერთმანეთთან ახლოსაა და ცალკე არეები ერთმანეთს ფარავდა
      // (ცარიელი ადგილის არე „ყლაპავდა" მეზობელ კოტლეტზე შეხებას). ვიღებთ თითთან უახლოეს კოტლეტს.
      const pad = 46;
      const x0 = Math.min(...own.map((q) => q.x)) - pad, x1 = Math.max(...own.map((q) => q.x)) + pad;
      const y0 = Math.min(...own.map((q) => q.y)) - pad, y1 = Math.max(...own.map((q) => q.y)) + pad;
      const zone = this.addUi(this.add.zone((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0)).setDepth(8).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (_p: Phaser.Input.Pointer, lx: number, ly: number) => {
        const px = x0 + lx, py = y0 + ly;
        const near = own
          .filter((q) => q.state !== 'empty')
          .map((q) => ({ q, d: Math.hypot((q.x - px) / 1.3, q.y - py) })) // კოტლეტი ფართოა — ჰორიზონტალურად მეტ ცდომილებას ვუშვებთ
          .sort((a, b) => a.d - b.d)[0];
        if (near && near.d < 90) this.onPatty(near.q);
      });
    }

    // თეფში, ლანგარი, ნაგავი
    this.uimg('plate', PLATE_X, PLATE_Y, 1.1).setDepth(1);
    const trash = this.uimg('icon_trash', 1555, 836, 1.7).setDepth(2).setInteractive({ useHandCursor: true });
    trash.on('pointerdown', () => this.clearPlate(true));
    this.text(1555, 884, S.service.trash, 16).setDepth(2);

    // აპარატები (მენიუს მიხედვით)
    const sides: { side: Side; key: string; x: number }[] = [];
    if (p.menu.includes('juice')) sides.push({ side: 'juice', key: this.stats.autoDrink ? 'bench_drink_auto' : 'bench_drink', x: 1265 });
    if (p.menu.includes('fries')) sides.push({ side: 'fries', key: 'bench_fryer', x: 1400 });
    if (p.menu.includes('icecream')) sides.push({ side: 'icecream', key: 'bench_icecream', x: 1530 });
    for (const m of sides) {
      const me = getManifest()[m.key] as { w: number; h: number; out?: [number, number]; spout?: [number, number] };
      const ms = 0.92;
      const img = this.uimg(m.key, m.x, MACH_Y, ms, 0.5, 1).setDepth(1).setInteractive({ useHandCursor: true });
      const top = MACH_Y - me.h * ms, left = m.x - (me.w * ms) / 2;
      const at = (q?: [number, number]): [number, number] | undefined => (q ? [left + q[0] * ms, top + q[1] * ms] : undefined);
      const mach: Machine = {
        side: m.side, x: m.x, top, state: 'idle', t: 0, out: at(me.out) ?? [m.x, top - 22], spout: at(me.spout),
        dur: m.side === 'juice' ? SERVICE.drinkTime : m.side === 'fries' ? SERVICE.friesTime : SERVICE.icecreamTime,
        img, bar: this.addUi(this.add.graphics()).setDepth(4),
      };
      img.on('pointerdown', () => this.onMachine(mach));
      this.machines.push(mach);
      if (m.side === 'juice' && this.stats.autoDrink) this.startMachine(mach, true);
    }
  }

  // ---------------- ქმედებები ----------------

  private get paused() {
    return this.pauses.size > 0 || this.ended;
  }

  private waitingOrders(): Order[] {
    return this.custs.filter((c) => c.state === 'wait').map((c) => c.order);
  }

  private shake(o: Phaser.GameObjects.Image) {
    // ხშირ შეხებაზე ახალი რყევა არ ვიწყოთ — თორემ შუა მოძრაობის x დაიმახსოვრება და ობიექტი გადაცურდება
    if (this.tweens.isTweening(o)) return;
    const x = o.x;
    this.tweens.add({ targets: o, x: x + 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => o.setX(x) });
  }

  /** ადგილზე მოსვლისას რბილი „ჩაჯდომა". */
  private squash(o: Img) {
    if (reducedMotion()) return;
    const sx = o.scaleX, sy = o.scaleY;
    this.tweens.add({ targets: o, scaleX: sx * 1.08, scaleY: sy * 0.9, duration: 110, yoyo: true, ease: 'Quad.out', onComplete: () => o.setScale(sx, sy) });
  }

  /** ღილაკის/ყუთის დაჭერა. */
  private press(o: Img) {
    if (reducedMotion()) return;
    const sx = o.scaleX, sy = o.scaleY;
    this.tweens.add({ targets: o, scaleX: sx * 0.94, scaleY: sy * 0.9, duration: 70, yoyo: true, onComplete: () => o.setScale(sx, sy) });
  }

  /** კოტლეტის გადატრიალება (ტექსტურის შეცვლა შუაში). */
  private flip(o: Img | undefined, key: string) {
    if (!o) return;
    if (reducedMotion()) { o.setTexture(key); return; }
    const sy = o.scaleY;
    this.tweens.add({
      targets: o, scaleY: 0, y: o.y - 14, duration: 120, ease: 'Quad.in',
      onComplete: () => {
        // კოტლეტი შეიძლება ამ დროს უკვე აიღეს (გაქრა) — განადგურებულ სურათზე setTexture თამაშს გააჩერებდა
        if (!o.active) return;
        o.setTexture(key);
        this.tweens.add({ targets: o, scaleY: sy, y: o.y + 14, duration: 160, ease: 'Back.out' });
      },
    });
  }

  /** კმაყოფილი კლიენტი: ხტომა და გული თავზე. */
  private cheer(c: Cust) {
    if (!reducedMotion()) this.tweens.add({ targets: c.img, y: c.img.y - 26, duration: 160, yoyo: true, repeat: 1, ease: 'Quad.out' });
    const [x, y] = this.toUi(c.img.x, c.img.y - 210);
    const heart = this.uimg('icon_heart', x, y, 0.4).setDepth(52);
    this.tweens.add({ targets: heart, y: y - 70, scale: 1.1 / R, alpha: 0, duration: 1100, ease: 'Cubic.out', onComplete: () => heart.destroy() });
  }

  private chefHop() {
    const c = this.chefImg;
    if (!c) return;
    this.tweens.add({ targets: c, scaleY: c.scaleY * 1.06, duration: 110, yoyo: true });
  }

  private hasStock(id: StockId) {
    return (store.get().stock[id] ?? 0) > 0;
  }

  private take(id: StockId): boolean {
    let ok = false;
    store.update((q) => { ok = consume(q, id); });
    this.updateBadges();
    if (ok && (store.get().stock[id] ?? 0) === 0) void this.onStockout(id);
    return ok;
  }

  /** ხელმისაწვდომი რაოდენობა: საწყობი + გრილზე მყოფი კოტლეტები + გზაში მყოფი მიწოდება. */
  private have(id: string): number {
    let n = store.get().stock[id] ?? 0;
    if (id === 'patty') n += this.grills.filter((g) => g.state === 'cooking' || g.state === 'ready').length;
    for (const d of this.deliveries) if (d.id === id) n += d.packs * STOCK[d.id].pack;
    return n;
  }

  /** შეიძლება თუ არა კლიენტის შეკვეთის დასრულება (თეფშზე უკვე დადებულის გათვალისწინებით). */
  private makeable(o: Order): boolean {
    // თეფშზე უკვე დადებული ფენები აღარ სჭირდება (needsOf ზედა ფუნთუშას არ ითვლის)
    const prefix = this.plate.length <= o.layers.length && this.plate.every((l, i) => o.layers[i] === l);
    const layers = prefix ? o.layers.slice(this.plate.length) : o.layers;
    const sides = [...o.sides];
    for (const t0 of this.tray) { const k = sides.indexOf(t0); if (k >= 0) sides.splice(k, 1); }
    return canMake(layers, sides, (id) => this.have(id));
  }

  /** მარაგი ამოიწურა — ბავშვი ირჩევს: სასწრაფო მიწოდება, ადრე დაკეტვა ან გაგრძელება. */
  private async onStockout(id: StockId) {
    if (this.closing || this.ended || this.prompted.has(id) || this.pauses.has('stockout')) return;
    if (!neededStock(this.stats.menu).includes(id)) return;
    if (this.have(id) > 0) return;
    // დღის ბოლო კლიენტიც უკვე აქ არის და მისი შეკვეთა სრულდება — კითხვა საჭირო არ არის
    if (this.spawned >= this.total && this.custs.every((c) => c.state !== 'wait' || this.makeable(c.order))) return;
    this.prompted.add(id);
    store.update((q) => noteStockout(q, id));
    this.pauses.add('stockout');
    const choice = await askStockout(id, this.grade, store.get().money);
    this.pauses.delete('stockout');
    if (choice.action === 'deliver') {
      store.update((q) => { buyEmergency(q, id, choice.packs); });
      this.startDelivery(id, choice.packs);
    } else if (choice.action === 'close') {
      this.closeEarly();
    }
    this.refreshSoldOut();
  }

  /** კურიერი: ყუთზე/აპარატზე უკუთვლა, დროის გასვლისას მარაგი ემატება. */
  private startDelivery(id: StockId, packs: number) {
    const bin = [...this.binBadges.entries()].find(([ing]) => ing === id)?.[1];
    const mach = this.machines.find((m) => SIDE_STOCK[m.side] === id);
    const [x, y] = bin ? [bin.x - 48, bin.y + 40] : mach ? [mach.x, mach.top - 60] : [PLATE_X, 700];
    const bg = this.addUi(this.add.circle(x, y, 34, 0xffffff, 0.95)).setDepth(40).setStrokeStyle(4, 0x2b1810);
    const icon = this.uimg('icon_clock', x, y - 6, 0.8).setDepth(41);
    const label = this.text(x, y + 22, String(EMERGENCY.deliverySeconds), 22, tokens.color.primaryDark).setDepth(42).setStroke('#ffffff', 5);
    this.tweens.add({ targets: [bg, icon], scale: { from: 0, to: (o: Phaser.GameObjects.Image) => o.scale }, duration: 300, ease: 'Back.out' });
    this.deliveries.push({ id, packs, t: EMERGENCY.deliverySeconds, parts: [bg, icon], label });
    toast(t(S.service.stockout.onTheWay, { n: packs, name: S.stock[id] }), 'icon_clock');
  }

  private tickDeliveries(dt: number) {
    for (const d of [...this.deliveries]) {
      d.t -= dt;
      d.label.setText(String(Math.max(0, Math.ceil(d.t))));
      if (d.t > 0) continue;
      this.deliveries.splice(this.deliveries.indexOf(d), 1);
      for (const p0 of d.parts) p0.destroy();
      d.label.destroy();
      store.update((q) => receiveDelivery(q, d.id, d.packs));
      this.prompted.delete(d.id);
      this.updateBadges();
      toast(t(S.service.stockout.arrived, { n: d.packs * STOCK[d.id].pack, name: S.stock[d.id] }), STOCK[d.id].icon);
      play('horn');
      this.refreshSoldOut();
    }
  }

  /** „ამოიწურა" შტამპი ბუშტზე, როცა შეკვეთა ვეღარ სრულდება. */
  private refreshSoldOut() {
    for (const c of this.custs) {
      if (c.state !== 'wait') continue;
      const out = !this.makeable(c.order);
      if (out && !c.soldOut) {
        c.soldOut = true;
        const b = c.bubble[0] as Img | undefined;
        if (b) {
          c.soldTag = this.text(b.x, b.y - 86, S.service.stockout.soldOut, 30, tokens.color.danger).setDepth(40).setStroke('#ffffff', 7).setAngle(-12);
          c.bubble.push(c.soldTag);
        }
      } else if (!out && c.soldOut) {
        c.soldOut = false;
        c.soldTag?.destroy();
        c.soldTag = undefined;
      }
    }
  }

  /** ადრე დაკეტვა: ახალი კლიენტები აღარ მოდიან, ვისაც ვერ მოემსახურები — ბოდიშით მიდის. */
  private closeEarly() {
    this.closing = true;
    store.update((q) => { ensureToday(q).closed = true; }); // გადატვირთვის შემდეგ ახალი კლიენტები აღარ მოვლენ
    this.total = this.spawned;
    toast(S.service.stockout.closing, 'icon_store');
    this.refreshSoldOut();
    for (const c of this.custs) if (c.state === 'wait' && c.soldOut) this.apologize(c);
  }

  private apologize(c: Cust) {
    this.noteMissed();
    c.mood = 'neutral';
    c.img.setTexture(`customer_${c.id}_neutral`);
    toast(S.service.stockout.sorry, `customer_${c.id}_neutral`);
    this.leave(c);
  }

  private outOfStock(id: StockId, target?: Img) {
    if (!this.prompted.has(id) && this.have(id) === 0) { void this.onStockout(id); return; }
    toast(t(S.service.outOfStock, { name: S.stock[id] }), STOCK[id].icon);
    if (target) this.shake(target);
    play('wrong');
  }

  private updateBadges() {
    const st = store.get().stock;
    for (const [ing, b] of this.binBadges) {
      const n = st[ing] ?? 0;
      b.setText(String(n)).setColor(n > 0 ? tokens.color.ink : tokens.color.danger);
    }
  }

  private waste(n: number) {
    if (n > 0) store.update((q) => { ensureToday(q).wasted += n; });
  }

  private onBin(ing: Ingredient, box: Img) {
    if (this.paused) return;
    this.press(box);
    if (ing === 'patty') {
      const slot = this.grills.find((g) => g.state === 'empty');
      if (!slot) { toast(S.service.grillFull, 'grill'); this.shake(box); return; }
      if (!this.take('patty')) { this.outOfStock('patty', box); return; }
      slot.state = 'cooking';
      slot.t = 0;
      // შეხებას გრილის საერთო არე იჭერს (buildBench)
      slot.img = this.uimg('grill_patty_raw', slot.x, slot.y, 1).setDepth(3);
      play('sizzle');
      this.chefHop();
      return;
    }
    const layer = layerFor(ing, this.plate);
    const uses = ing !== 'bun' || layer === 'bun_bottom'; // ფუნთუშა ერთხელ იხარჯება
    if (uses && !this.hasStock(ing)) { this.outOfStock(ing, box); return; }
    if (this.addLayer(layer, box) && uses) this.take(ing);
  }

  private addLayer(layer: Layer, from?: Img): boolean {
    if (!canAdd(layer, this.plate, this.waitingOrders())) {
      toast(this.plate.length === 0 && layer !== 'bun_bottom' ? S.service.needBun : S.service.wrongLayer, 'icon_menu_book');
      if (from) this.shake(from);
      play('wrong');
      return false;
    }
    this.plate.push(layer);
    this.drawPlate();
    play('pop');
    this.chefHop();
    if (burgerDone(this.plate) && !this.tut) toast(S.service.serveHint, 'menu_burger'); // სწავლებისას ამას ყუთი ამბობს
    return true;
  }

  private drawPlate() {
    for (const i of this.plateImgs) { this.tweens.killTweensOf(i); i.destroy(); }
    this.plateImgs = [];
    const k = 1;
    let y = 852;
    this.plate.forEach((l, i) => {
      const e = getManifest()[`layer_${l}`];
      const img = this.uimg(`layer_${l}`, PLATE_X, y, k, 0.5, e.anchor[1] / e.h).setDepth(10 + i);
      this.plateImgs.push(img);
      y -= (e.stack ?? 10) * k;
      if (i === this.plate.length - 1) this.tweens.add({ targets: img, y: { from: img.y - 30, to: img.y }, duration: 220, ease: 'Bounce.out' });
    });
  }

  private drawTray() {
    for (const i of this.trayImgs) i.destroy();
    for (const tx of this.trayTexts) tx.destroy();
    this.trayTexts = [];
    // ერთნაირი კერძები ერთად: იკონა + ×2
    const kinds = [...new Set(this.tray)];
    this.trayImgs = kinds.map((s, i) => {
      const n = this.tray.filter((x) => x === s).length;
      const x = TRAY_X + i * 72;
      if (n > 1) this.trayTexts.push(this.text(x + 26, TRAY_Y + 38, `×${n}`, 22).setDepth(6).setStroke('#ffffff', 5));
      return this.uimg(PRODUCTS[s].icon, x, TRAY_Y, s === 'fries' ? 0.9 : 0.72).setDepth(5);
    });
  }

  private clearPlate(manual: boolean) {
    if (manual && (this.paused || (!this.plate.length && !this.tray.length))) return;
    if (manual) this.waste(this.plate.filter((l) => l !== 'bun_top').length + this.tray.length);
    this.plate = [];
    this.tray = [];
    this.drawPlate();
    this.drawTray();
    if (manual) play('trash');
  }

  private onPatty(slot: GrillSlot) {
    if (this.paused) return;
    if (slot.state === 'cooking') { if (slot.img) this.shake(slot.img); return; }
    if (slot.state === 'burnt') { this.emptySlot(slot); this.waste(1); play('trash'); return; }
    if (slot.state === 'ready' && this.addLayer('patty', slot.img)) this.emptySlot(slot);
  }

  private emptySlot(slot: GrillSlot) {
    if (slot.img) this.tweens.killTweensOf(slot.img);
    slot.img?.destroy();
    slot.img = undefined;
    for (const p of slot.puffs) { this.tweens.killTweensOf(p); p.destroy(); }
    slot.puffs = [];
    slot.state = 'empty';
  }

  private puffs(slot: GrillSlot, color: number) {
    for (const p of slot.puffs) { this.tweens.killTweensOf(p); p.destroy(); }
    slot.puffs = [];
    for (let k = 0; k < 3; k++) {
      const c = this.addUi(this.add.circle(slot.x, slot.y - 6, 7, color, 0.8)).setDepth(6);
      slot.puffs.push(c);
      this.tweens.add({
        targets: c, y: slot.y - 46, scale: 1.8, alpha: 0, duration: 1300, delay: k * 430, repeat: -1,
        onRepeat: () => c.setPosition(slot.x + Phaser.Math.Between(-8, 8), slot.y - 6),
      });
    }
  }

  private onMachine(m: Machine) {
    if (this.paused) return;
    if (m.state === 'idle') { if (this.startMachine(m)) play('click'); return; }
    if (m.state === 'ready') {
      if (this.tray.filter((x) => x === m.side).length >= 3 || this.tray.length >= 4) { toast(S.service.trayFull, PRODUCTS[m.side].icon); return; }
      this.tray.push(m.side);
      this.drawTray();
      play('pop');
      if (m.product) this.tweens.killTweensOf(m.product);
      m.product?.destroy();
      m.product = undefined;
      m.state = 'idle';
      if (m.side === 'juice' && this.stats.autoDrink) this.startMachine(m, true);
    }
  }

  /** quiet — ავტომატური შევსებისას მარაგის ამოწურვაზე შეტყობინება არ ჩნდება. */
  private startMachine(m: Machine, quiet = false): boolean {
    const id = SIDE_STOCK[m.side];
    if (!this.take(id)) {
      if (!quiet) this.outOfStock(id, m.img);
      return false;
    }
    m.state = 'working';
    m.t = 0;
    return true;
  }

  // ---------------- კლიენტები ----------------

  private spawn() {
    const L = this.room.layout;
    const taken = new Set(this.custs.map((c) => c.spot));
    const free = L.spots.map((_, i) => i).filter((i) => !taken.has(i));
    if (!free.length) return false;
    const order = makeFeasibleOrder(this.stats.menu, (x) => this.have(x), Math.random, sideQtyMax(this.grade, store.get().adaptive?.mul.level));
    if (!order) {
      // ვერცერთ ბურგერს ვერ ვაკეთებთ: ჯერ ვკითხულობთ ამოწურულ ინგრედიენტზე (ჯერ ბურგერისას,
      // მერე გვერდითი კერძებისას). თუ ყველაფერზე უკვე ვიკითხეთ და მიწოდება არ მოდის — კლიენტი
      // კარიდან ბრუნდება, რომ დღე ბუნებრივად დასრულდეს (ანგარიშში: „მარაგის გამო წასული")
      const sideStock = new Set<string>(Object.values(SIDE_STOCK));
      const outs = neededStock(this.stats.menu).filter((x) => this.have(x) <= 0)
        .sort((a, b) => Number(sideStock.has(a)) - Number(sideStock.has(b)));
      const ask = outs.find((x) => !this.prompted.has(x));
      if (ask) {
        void this.onStockout(ask);
        return false;
      }
      if (!this.deliveries.length && !this.pauses.has('stockout')) {
        this.spawned += 1;
        this.noteMissed();
        this.noteSeen();
        return true;
      }
      return false;
    }
    if (this.tut && !this.custs.length) order.sides = []; // სწავლების კლიენტს — მხოლოდ ბურგერი
    const spot = free[Math.floor(Math.random() * free.length)];
    const present = new Set(this.custs.map((c) => c.id));
    const pool = CUSTOMER_IDS.filter((id) => !present.has(id));
    const id = pool[Math.floor(Math.random() * pool.length)];
    const door: [number, number] = [0.4 * T, (L.door.at + 0.8) * T];
    const sp = L.spots[spot];
    const to: [number, number] = [sp.x * T, sp.y * T];
    const img = this.place(`customer_${id}_happy`, door[0], door[1], 0, 10 + door[1]);
    this.uiCam.ignore(img);
    img.setInteractive({ useHandCursor: true });
    const max = SERVICE.patience * this.stats.patience * SERVICE.patienceByGrade[this.grade];
    const c: Cust = {
      id, order, spot, img, state: 'walk', from: door, to, walkT: 0,
      walkDur: Math.hypot(to[0] - door[0], to[1] - door[1]) / 90 + 0.6, patience: max, max, mood: 'happy', bubble: [],
    };
    img.on('pointerdown', () => void this.serve(c));
    this.custs.push(c);
    this.spawned += 1;
    this.noteSeen();
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 300 });
    play('doorbell');
    if (this.spawned === this.total) toast(S.service.lastCustomer, 'icon_people');
    return true;
  }

  private moveCust(c: Cust, dt: number) {
    c.walkT = Math.min(1, c.walkT + dt / c.walkDur);
    const [x0, y0] = c.from, [x1, y1] = c.to;
    const wx = x0 + (x1 - x0) * c.walkT, wy = y0 + (y1 - y0) * c.walkT;
    const [sx, sy] = this.iso(wx, wy);
    c.img.setPosition(sx, sy - Math.abs(Math.sin(c.walkT * Math.PI * 7)) * 7).setDepth(10 + wy + wx * 0.001);
    return c.walkT >= 1;
  }

  private showBubble(c: Cust) {
    const n = this.room.layout.spots.length;
    const bx = VIEW.w / 2 + (c.spot - (n - 1) / 2) * 290;
    const by = 196;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const bubble = this.uimg('bubble', bx, by + 52, 1.3, 0.5, 1).setDepth(20).setInteractive({ useHandCursor: true });
    bubble.on('pointerdown', () => void this.serve(c));
    parts.push(bubble);
    // ბურგერი (ფენები) + გვერდითი კერძები
    const k2 = 0.6;
    const stackX = c.order.sides.length ? bx - 36 : bx;
    let y = by - 6;
    c.order.layers.forEach((l, i) => {
      const e = getManifest()[`layer_${l}`];
      parts.push(this.uimg(`layer_${l}`, stackX, y, k2, 0.5, e.anchor[1] / e.h).setDepth(21 + i));
      y -= (e.stack ?? 10) * k2;
    });
    const kinds = [...new Set(c.order.sides)];
    kinds.forEach((s, i) => {
      parts.push(this.uimg(PRODUCTS[s].icon, bx + 62, by - 22 + i * 40, s === 'fries' ? 0.7 : 0.58).setDepth(30));
      const n = c.order.sides.filter((x) => x === s).length;
      if (n > 1) parts.push(this.text(bx + 84, by + 2 + i * 40, `×${n}`, 24).setDepth(31).setStroke('#ffffff', 5));
    });
    const tail = this.addUi(this.add.graphics()).setDepth(19);
    const bar = this.addUi(this.add.graphics()).setDepth(31);
    parts.push(tail, bar);
    c.bubble = parts;
    c.tail = tail;
    c.bar = bar;
    for (const p of parts) this.tweens.add({ targets: p, scale: { from: 0, to: (p as Img).scale ?? 1 }, duration: 260, ease: 'Back.out' });
    this.drawTail(c, bx, by + 52);
    play('order');
  }

  private drawTail(c: Cust, bx: number, by: number) {
    const [hx, hy] = this.toUi(c.img.x, c.img.y - 200);
    const g = c.tail!;
    g.clear();
    g.lineStyle(9, Phaser.Display.Color.HexStringToColor(tokens.color.ink).color, 1);
    g.lineBetween(bx, by - 8, hx, hy);
    g.lineStyle(4, 0xfffbf2, 1);
    g.lineBetween(bx, by - 8, hx, hy);
    g.fillStyle(0xfffbf2, 1).lineStyle(3, 0x2b1810, 1);
    g.fillCircle(hx, hy, 7).strokeCircle(hx, hy, 7);
  }

  private drawPatience(c: Cust) {
    const g = c.bar!;
    const bubble = c.bubble[0] as Img;
    const x = bubble.x - 80, y = bubble.y - 50, w = 160, h = 14;
    const f = Math.max(0, c.patience / c.max);
    const col = f > 0.6 ? tokens.color.happy : f > 0.3 ? tokens.color.neutral : tokens.color.angry;
    g.clear();
    g.fillStyle(0xffffff, 1).fillRoundedRect(x, y, w, h, 7);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(col).color, 1).fillRoundedRect(x, y, Math.max(h, w * f), h, 7);
    g.lineStyle(3, 0x2b1810, 1).strokeRoundedRect(x, y, w, h, 7);
  }

  private setMood(c: Cust) {
    const f = c.patience / c.max;
    const mood: Mood = f > 0.6 ? 'happy' : f > 0.3 ? 'neutral' : 'angry';
    if (mood !== c.mood) {
      c.mood = mood;
      c.img.setTexture(`customer_${c.id}_${mood}`);
    }
  }

  private removeBubble(c: Cust) {
    for (const p of c.bubble) { this.tweens.killTweensOf(p); p.destroy(); }
    c.bubble = [];
  }

  private leave(c: Cust) {
    c.state = 'leave';
    this.removeBubble(c);
    c.from = c.to;
    c.to = [0.4 * T, (this.room.layout.door.at + 0.8) * T];
    c.walkT = 0;
  }

  private async serve(c: Cust) {
    if (this.paused || c.state !== 'wait') return;
    if (c.soldOut && !(burgerDone(this.plate) && matches(c.order, this.plate, this.tray))) { this.apologize(c); return; }
    if (!burgerDone(this.plate) || !matches(c.order, this.plate, this.tray)) {
      const sameBurger = burgerDone(this.plate) && this.plate.length === c.order.layers.length && this.plate.every((l, i) => l === c.order.layers[i]);
      if (!burgerDone(this.plate)) { if (this.plate.length) toast(S.service.notReady, 'menu_burger'); }
      else toast(sameBurger ? S.service.sideMissing : S.service.notMine, 'icon_menu_book');
      this.shake(c.img);
      return;
    }
    c.state = 'pay';
    this.clearPlate(false);
    this.removeBubble(c);
    this.pauses.add('cashier');
    play('serve');

    const p = store.get();
    const lv = (op: 'add' | 'sub' | 'mul' | 'div') => p.adaptive?.[op].level ?? 2;
    const plan = cashierPlan(c.order, this.grade, { add: lv('add'), sub: lv('sub'), mul: lv('mul'), div: lv('div') }, S.products);
    for (const pr of plan.problems) {
      await askProblem(S.service.cashier, pr, { cancellable: false, hintFirst: pr.kind === 'change' && this.stats.changeHint });
    }
    const totalPrice = plan.total;

    const tipBase = SERVICE.tip[c.mood];
    const tip = Math.round(tipBase * (GRADE_SCALE[this.grade] >= 1 ? GRADE_SCALE[this.grade] : 0.5));
    const earned = totalPrice + tip;
    store.update((q) => {
      q.money += earned;
      recordSale(q, [c.order.burger, ...c.order.sides], totalPrice, tip);
      if (c.mood === 'happy') { const td = ensureToday(q); td.happy = (td.happy ?? 0) + 1; }
    });
    this.revenue += earned;
    this.tips += tip;
    this.served += 1;
    setSession({ earned: this.revenue });
    this.coinPop(c, earned, tip);
    this.cheer(c);
    this.pauses.delete('cashier');
    this.time.delayedCall(500, () => this.leave(c));
  }

  private coinPop(c: Cust, amount: number, tip: number) {
    const [x, y] = this.toUi(c.img.x, c.img.y - 160);
    flyCoins(x, y, amount);
    const label = this.text(x, y - 30, `+${amount} ${S.currency}`, 34, tokens.color.successDark).setDepth(51).setStroke('#ffffff', 6);
    this.tweens.add({ targets: label, y: y - 110, alpha: 0, duration: 1400, ease: 'Cubic.out', onComplete: () => label.destroy() });
    if (tip > 0) {
      const tl = this.text(x, y + 10, t(S.service.tip, { n: tip }), 22, tokens.color.primaryDark).setDepth(51).setStroke('#ffffff', 5);
      this.tweens.add({ targets: tl, y: y - 50, alpha: 0, duration: 1600, delay: 200, onComplete: () => tl.destroy() });
    }
  }

  // ---------------- დრო ----------------

  private clockText(f: number) {
    const [open, close] = this.hours;
    const mins = Math.round((open + (close - open) * Math.min(1, f)) * 60);
    const hh = Math.floor(mins / 60), mm = Math.floor((mins % 60) / 10) * 10;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  update(_time: number, delta: number) {
    if (!this.built) return;
    const dt = Math.min(0.1, delta / 1000);
    this.tutTick(dt);
    if (this.paused) return;
    if (!this.tut) this.elapsed += dt; // სწავლებისას დღის საათი დგას

    // გრილი
    const cook = SERVICE.cookTime / this.stats.cookSpeed;
    for (const g of this.grills) {
      if (g.state === 'cooking') {
        g.t += dt;
        if (g.t >= cook) {
          g.state = 'ready';
          g.t = 0;
          this.flip(g.img, 'grill_patty_ready');
          this.puffs(g, 0xffffff);
          play('ding');
        }
      } else if (g.state === 'ready' && !this.tut) { // სწავლებისას არ იწვება
        g.t += dt;
        if (g.t >= SERVICE.readyWindow) {
          g.state = 'burnt';
          g.img?.setTexture('grill_patty_burnt');
          this.puffs(g, 0x6b5f5a);
          toast(S.service.burnt, 'grill_patty_burnt');
          play('wrong');
        }
      }
    }

    // აპარატები
    for (const m of this.machines) {
      m.bar.clear();
      if (m.state !== 'working') continue;
      m.t += dt;
      const f = Math.min(1, m.t / m.dur);
      m.bar.fillStyle(0xffffff, 1).fillRoundedRect(m.x - 40, m.top - 22, 80, 12, 6);
      m.bar.fillStyle(Phaser.Display.Color.HexStringToColor(tokens.color.success).color, 1).fillRoundedRect(m.x - 40, m.top - 22, Math.max(12, 80 * f), 12, 6);
      m.bar.lineStyle(2.5, 0x2b1810, 1).strokeRoundedRect(m.x - 40, m.top - 22, 80, 12, 6);
      // ჩანს, რომ წვენი/ნაყინი ონკანიდან ჭიქაში ისხმება
      if (m.spout) {
        const col = m.side === 'juice' ? 0xffa53d : 0xffc2d4;
        const wob = Math.sin(this.elapsed * 18) * 1.5;
        m.bar.lineStyle(7, 0x2b1810, 0.9).lineBetween(m.spout[0] + wob, m.spout[1], m.spout[0], m.out[1] + 4);
        m.bar.lineStyle(4, col, 1).lineBetween(m.spout[0] + wob, m.spout[1], m.spout[0], m.out[1] + 4);
      }
      if (f >= 1) {
        m.state = 'ready';
        m.bar.clear();
        m.product = this.uimg(PRODUCTS[m.side].icon, m.out[0], m.out[1], m.side === 'fries' ? 0.62 : m.side === 'juice' ? 0.6 : 0.5).setDepth(8).setInteractive({ useHandCursor: true });
        m.product.on('pointerdown', () => this.onMachine(m));
        this.tweens.add({ targets: m.product, scale: { from: m.product.scale, to: m.product.scale * 1.12 }, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        play('ding');
      }
    }

    this.tickDeliveries(dt);

    // კლიენტები
    this.sinceSpawn += dt;
    const waiting = this.custs.filter((c) => c.state === 'wait' || c.state === 'walk').length;
    if (this.spawned < this.total && !(this.tut && this.custs.length >= 1) && (this.sinceSpawn >= SERVICE.spawnEvery || (waiting === 0 && this.sinceSpawn >= 2))) {
      if (this.spawn()) this.sinceSpawn = 0;
    }
    for (const c of [...this.custs]) {
      if (c.state === 'walk') {
        if (this.moveCust(c, dt)) { c.state = 'wait'; this.showBubble(c); this.refreshSoldOut(); this.squash(c.img); }
      } else if (c.state === 'wait') {
        if (!this.tut) c.patience -= dt; // სწავლებისას მოთმინება არ იკლებს
        this.setMood(c);
        this.drawPatience(c);
        if (c.patience <= 0) {
          if (c.soldOut) this.noteMissed();
          else this.noteLeft();
          toast(S.service.leftAngry, `customer_${c.id}_angry`);
          play('grumble');
          this.shake(c.img);
          this.leave(c);
        }
      } else if (c.state === 'leave') {
        if (this.moveCust(c, dt)) {
          this.tweens.killTweensOf(c.img);
          c.img.destroy();
          this.custs.splice(this.custs.indexOf(c), 1);
        }
      }
    }

    // საათი
    this.clockTick += dt;
    if (this.clockTick > 0.5) {
      this.clockTick = 0;
      const expected = this.total * SERVICE.spawnEvery + 25;
      setSession({ clock: this.clockText(this.elapsed / expected) });
      this.refreshSoldOut();
    }

    if (this.spawned >= this.total && this.custs.length === 0) {
      if (this.tut && (this.tut.step === 'cash' || this.tut.step === 'done')) this.endTutorial();
      this.ended = true;
      // გადახდილი სასწრაფო მიწოდება არ უნდა დაიკარგოს — მარაგში ემატება
      for (const d of this.deliveries) {
        store.update((q) => receiveDelivery(q, d.id, d.packs));
        for (const p0 of d.parts) p0.destroy();
        d.label.destroy();
      }
      this.deliveries = [];
      setSession({ clock: this.clockText(1) });
      const summary: DaySummary = { day: store.get().day, served: this.served, left: this.left, revenue: this.revenue, tips: this.tips, goal: this.goal };
      store.update((q) => closeService(q, 0, 0)); // left/missed უკვე ჩაწერილია (noteLeft/noteMissed)
      banner(S.service.closedSign, 'icon_store', 'close');
      this.time.delayedCall(1600, () => bus.emit('dayEnd', summary));
    }
  }

  // ---------------- პირველი დღის სწავლება ----------------

  /** ციმციმა რგოლი ისრით UI-კოორდინატებზე (1600×900). */
  private pointAt(at: [number, number] | null) {
    if (!at) { this.tutPtr?.setVisible(false); return; }
    if (!this.tutPtr) {
      const orange = Phaser.Display.Color.HexStringToColor(tokens.color.primary).color;
      const ring = this.add.graphics();
      ring.lineStyle(10, 0xffffff, 0.95).strokeCircle(0, 0, 50);
      ring.lineStyle(6, orange, 1).strokeCircle(0, 0, 50);
      const arrow = this.add.graphics();
      arrow.fillStyle(orange, 1).lineStyle(4, 0x2b1810, 1);
      arrow.fillRect(-14, -124, 28, 30).strokeRect(-14, -124, 28, 30);
      arrow.fillTriangle(-34, -96, 34, -96, 0, -60).strokeTriangle(-34, -96, 34, -96, 0, -60);
      this.tutPtr = this.addUi(this.add.container(0, 0, [ring, arrow])).setDepth(60);
      this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.6, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (!reducedMotion()) this.tweens.add({ targets: arrow, y: -14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.tutPtr.setPosition(at[0], at[1]).setVisible(true);
  }

  /** სწავლების ტექსტი (DOM, ოთახის ქვედა ნაწილზე — ყუთებს და ბუშტებს არ ფარავს). */
  private say(text: string, ok?: () => void) {
    const tt = this.tut;
    if (!tt || tt.said === text) return;
    tt.said = text;
    play(tt.step === 'done' ? 'badge' : 'order');
    this.coach?.remove();
    this.coach = h('div', { class: 'coach', role: 'status', 'aria-live': 'polite' },
      h('img', { src: `${import.meta.env.BASE_URL}assets/icon_chef_hat.svg`, alt: '' }),
      h('p', null, text),
      h('div', { class: 'coach-btns interactive' },
        speakButton(() => text),
        ok ? h('button', { class: 'btn green', onClick: ok }, S.tutorial.ok) : '',
        tt.step !== 'done' ? h('button', { class: 'link-btn', onClick: () => this.endTutorial() }, S.tutorial.skip) : '',
      ),
    );
    layers.coach.append(this.coach);
    this.placeOverlays(); // შეტყობინება სწავლების ყუთის ზემოთ ჯდება
    if (autoRead() && !document.querySelector('#ui .modal')) void speak(text);
  }

  private endTutorial() {
    if (!this.tut) return;
    this.tut = null;
    this.coach?.remove();
    this.coach = undefined;
    this.placeOverlays();
    if (this.tutPtr) this.tweens.killTweensOf(this.tutPtr.list);
    this.tutPtr?.destroy();
    this.tutPtr = undefined;
    store.update((q) => { q.tutorialDone = true; });
    // მომდევნო კლიენტი მალე მოვა
    this.sinceSpawn = Math.max(this.sinceSpawn, SERVICE.spawnEvery - 3);
  }

  /** სწავლების ნაბიჯები: რას აკეთებს ბავშვი ახლა და სად უნდა დააჭიროს. */
  private tutTick(dt: number) {
    const tt = this.tut;
    if (!tt) return;
    const T2 = S.tutorial;
    if (tt.step === 'wait') tt.cust = this.custs.find((x) => x.state === 'wait');
    const c = tt.cust;
    const bubbleAt = (): [number, number] | null => {
      const b = c?.bubble[0] as Img | undefined;
      return b ? [b.x, b.y - 80] : null;
    };
    switch (tt.step) {
      case 'wait':
        this.pointAt(null);
        if (!this.pauses.has('prep')) this.say(T2.wait);
        if (c?.state === 'wait') tt.step = 'look';
        break;
      case 'look':
        if (this.plate.length > 0 || (c && c.state !== 'wait')) { tt.step = 'build'; break; }
        this.pointAt(bubbleAt());
        this.say(T2.look, () => { if (this.tut) this.tut.step = 'build'; });
        break;
      case 'build': {
        if (!c || c.state !== 'wait') { tt.step = 'cash'; break; }
        if (burgerDone(this.plate) && matches(c.order, this.plate, this.tray)) { tt.step = 'serve'; break; }
        const next = c.order.layers[this.plate.length];
        if (!next && burgerDone(this.plate)) {
          // ბურგერი მზადაა, აკლია გვერდითი კერძი (წვენი/ფრი/ნაყინი)
          const tray = [...this.tray];
          const need = c.order.sides.find((sd) => { const k = tray.indexOf(sd); if (k < 0) return true; tray.splice(k, 1); return false; });
          const m = need && this.machines.find((x) => x.side === need);
          if (m) {
            const item = S.products[m.side] ?? m.side;
            if (m.state === 'ready' && m.product) { this.pointAt([m.product.x, m.product.y]); this.say(t(T2.sideTake, { item })); }
            else if (m.state === 'working') { this.pointAt([m.x, m.top + 60]); this.say(t(T2.sideWait, { item })); }
            else { this.pointAt([m.x, m.top + 60]); this.say(t(T2.sideStart, { item })); }
          }
          break;
        }
        if (next === 'patty') {
          const ready = this.grills.find((g) => g.state === 'ready');
          const cooking = this.grills.find((g) => g.state === 'cooking');
          if (ready) { this.pointAt([ready.x, ready.y]); this.say(T2.patty); }
          else if (cooking) { this.pointAt([cooking.x, cooking.y]); this.say(T2.cook); }
          else { this.pointAt(this.binAt.get('patty') ?? null); this.say(T2.grill); }
        } else if (next === 'bun_bottom' || !next) {
          this.pointAt(this.binAt.get('bun') ?? null); this.say(T2.bun);
        } else if (next === 'bun_top') {
          this.pointAt(this.binAt.get('bun') ?? null); this.say(T2.top);
        } else {
          this.pointAt(this.binAt.get(next as Ingredient) ?? null);
          this.say(t(T2.next, { item: (S.ingredients as Record<string, string>)[next] ?? next }));
        }
        break;
      }
      case 'serve':
        if (!burgerDone(this.plate)) { tt.step = 'build'; break; }
        this.pointAt(bubbleAt());
        this.say(T2.serve);
        if (c?.state === 'pay') tt.step = 'cash';
        break;
      case 'cash':
        this.pointAt(null);
        this.say(T2.cash);
        if (!c || c.state === 'leave' || !this.custs.includes(c)) { tt.step = 'done'; tt.t = 0; }
        break;
      case 'done':
        this.pointAt(null);
        this.say(T2.done, () => this.endTutorial());
        tt.t += dt;
        if (tt.t > 7) this.endTutorial();
        break;
    }
  }

  /** გაბრაზებით წასული კლიენტი — მაშინვე ინახება (ანგარიშისთვის, გადატვირთვაზეც). */
  private noteLeft() {
    this.left += 1;
    store.update((q) => { const t0 = ensureToday(q); t0.left = (t0.left ?? 0) + 1; });
  }

  /** მარაგის გამო ვერმომსახურე კლიენტი. */
  private noteMissed() {
    this.missed += 1;
    store.update((q) => { const t0 = ensureToday(q); t0.missed = (t0.missed ?? 0) + 1; });
  }

  /** დღეს მოსული (ან კარიდან დაბრუნებული) კლიენტების რაოდენობა — ინახება პროგრესში. */
  private noteSeen() {
    store.update((q) => { const t0 = ensureToday(q); t0.seen = (t0.seen ?? 0) + 1; });
  }
}

// ფონური მუსიკა: რბილი, ჯაზური „დაინერის" მელოდია (Web Audio-თი, ფაილების გარეშე — ოფლაინაც მუშაობს).
//  * ელექტრო-პიანინოს აკორდები, მოსიარულე ბასი, ჩუმი „ჯაგრისი", ზოგჯერ ვიბრაფონის მელოდია;
//  * 16 ტაქტი (~42 წმ); მელოდია ყოველ მეორე წრეზე ისმის — ასე ნაკლებად ბეზრდება
//    (კაფეს მუსიკალური ავტომატით — ყოველ წრეზე);
//  * ძალიან ჩუმად, თბილი ფილტრით; ხმა/მუსიკა გამორთულია, მასწავლებლის პანელშია ან
//    აპი ფონზეა — ჩუმდება.
import { store } from '../core/store';
import { audioCtx } from './sfx';

const BPM = 92;
const BEAT = 60 / BPM;
const SWING = 0.6; // ჯაზური „სვინგი": წყვილი მერვედებიდან პირველი გრძელია
const VOLUME = 0.32;
const BARS = 16;

const f = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface Chord { bass: number; third: 3 | 4; voicing: number[] }
const C: Chord = { bass: 48, third: 4, voicing: [60, 64, 67, 71] };
const Am: Chord = { bass: 45, third: 3, voicing: [57, 60, 64, 67] };
const Dm: Chord = { bass: 50, third: 3, voicing: [57, 60, 62, 65] };
const G7: Chord = { bass: 43, third: 4, voicing: [55, 59, 62, 65] };
const F: Chord = { bass: 41, third: 4, voicing: [57, 60, 64, 65] };
const Em: Chord = { bass: 40, third: 3, voicing: [55, 59, 62, 64] };
const A7: Chord = { bass: 45, third: 4, voicing: [55, 57, 61, 64] };
const SONG: Chord[] = [C, Am, Dm, G7, C, Am, Dm, G7, F, Em, Dm, G7, Em, A7, Dm, G7];

/** მელოდიის ფრაზები: [მერვედის ნომერი 4 ტაქტში (0–31), MIDI ნოტი]. */
const PHRASES: [number, number][][] = [
  [[0, 76], [2, 79], [3, 81], [6, 79], [8, 76], [12, 74], [16, 72], [18, 74], [19, 76], [22, 74], [24, 72], [26, 69], [28, 67]],
  [[0, 76], [2, 79], [4, 84], [6, 83], [8, 81], [10, 79], [12, 76], [16, 74], [18, 76], [20, 77], [22, 76], [24, 74], [26, 71], [28, 72]],
  [[0, 77], [2, 76], [4, 72], [8, 76], [10, 74], [12, 71], [16, 74], [18, 72], [20, 69], [24, 71], [26, 74], [28, 79]],
  [[0, 79], [2, 76], [4, 73], [8, 74], [10, 76], [12, 77], [16, 77], [18, 76], [20, 74], [22, 72], [24, 71], [26, 74], [28, 72]],
];

let bus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;      // მერვედი სიმღერის დასაწყისიდან
let loop = 0;      // რომელი წრეა
let nextTime = 0;
let wanted = false;

function ensureBus(c: AudioContext) {
  if (bus) return bus;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  bus = c.createGain();
  bus.gain.value = 0;
  bus.connect(lp).connect(c.destination);
  noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  return bus;
}

function voice(c: AudioContext, freq: number, t: number, dur: number, vol: number, type: OscillatorType, attack = 0.012) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** ელექტრო-პიანინო: ძირითადი ტონი + ჩუმი „ზარის" ობერტონი. */
function epiano(c: AudioContext, notes: number[], t: number, dur: number, vol: number) {
  for (const m of notes) {
    voice(c, f(m), t, dur, vol, 'sine');
    voice(c, f(m) * 2, t, dur * 0.4, vol * 0.18, 'sine');
  }
}

function brush(c: AudioContext, t: number, vol: number) {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(hp).connect(g).connect(bus!);
  s.start(t);
}

/** ერთი მერვედის ნოტები. */
function playStep(c: AudioContext, s: number, t: number) {
  const bar = Math.floor(s / 8) % BARS;
  const e = s % 8; // მერვედი ტაქტში
  const ch = SONG[bar];
  const next = SONG[(bar + 1) % BARS];
  // ბასი: მეოთხედები — ძირი, ტერცია, კვინტა, მომდევნო აკორდისკენ ნახევარტონით მიახლოება
  if (e % 2 === 0) {
    const q = e / 2;
    const m = q === 0 ? ch.bass : q === 1 ? ch.bass + ch.third : q === 2 ? ch.bass + 7 : next.bass + (next.bass > ch.bass ? -1 : 1);
    voice(c, f(m), t, BEAT * 0.95, 0.11, 'triangle', 0.02);
  }
  // აკორდები: 1-ელ დარტყმაზე და მე-2-ის „და"-ზე (ჯაზური კომპინგი)
  if (e === 0) epiano(c, ch.voicing, t, BEAT * 2.2, 0.03);
  if (e === 3) epiano(c, ch.voicing.slice(1), t, BEAT * 0.9, 0.02);
  // ჯაგრისი სუსტ მერვედებზე
  if (e % 2 === 1) brush(c, t, 0.05);
  else if (e === 2 || e === 6) brush(c, t, 0.025);
  // მელოდია: ყოველ მეორე წრეზე (ავტომატით — ყოველთვის)
  const jukebox = (store.get().owned?.jukebox ?? 0) > 0;
  if (jukebox || loop % 2 === 1) {
    const phrase = PHRASES[Math.floor(bar / 4)];
    const pos = (bar % 4) * 8 + e;
    for (const [at, m] of phrase) if (at === pos) voice(c, f(m), t, BEAT * 1.6, 0.05, 'sine', 0.02);
  }
}

function tick() {
  const c = audioCtx();
  if (!c || !bus) return;
  while (nextTime < c.currentTime + 0.25) {
    playStep(c, step, nextTime);
    // სვინგი: ლუწი მერვედი გრძელია, კენტი — მოკლე
    nextTime += BEAT * (step % 2 === 0 ? SWING : 1 - SWING);
    step += 1;
    if (step % (BARS * 8) === 0) loop += 1;
  }
}

function start() {
  const c = audioCtx();
  if (!c || timer) return;
  if (c.state === 'suspended') void c.resume();
  const b = ensureBus(c);
  nextTime = c.currentTime + 0.15;
  b.gain.cancelScheduledValues(c.currentTime);
  b.gain.setValueAtTime(b.gain.value, c.currentTime);
  b.gain.linearRampToValueAtTime(VOLUME, c.currentTime + 2.5); // რბილი შემოსვლა
  timer = setInterval(tick, 60);
  tick();
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  const c = audioCtx();
  if (c && bus) {
    bus.gain.cancelScheduledValues(c.currentTime);
    bus.gain.setValueAtTime(bus.gain.value, c.currentTime);
    bus.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
  }
}

/** უნდა ისმოდეს თუ არა ახლა (გარე პირობას — მაგ. მასწავლებლის პანელს — main აწვდის). */
export function setMusicWanted(on: boolean) {
  wanted = on;
  sync();
}

function sync() {
  const s = store.get().settings;
  const on = wanted && s.sound && s.music !== false && !document.hidden;
  if (on) start();
  else stop();
}

/** ჩართვა: ბრაუზერი ხმას მხოლოდ პირველი შეხების შემდეგ უშვებს; პარამეტრების/ხილვადობის ცვლილებაზე — ახლდება. */
export function initMusic() {
  // ტესტირებისთვის (მხოლოდ dev): უკრავს თუ არა ახლა
  if (import.meta.env.DEV) Object.assign(window, { __music: () => ({ playing: timer !== null, step, loop, gain: bus?.gain.value ?? 0, wanted, hidden: document.hidden, settings: store.get().settings }) });
  store.subscribe(() => sync());
  document.addEventListener('visibilitychange', sync);
  const first = () => sync();
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, first, { passive: true });
}

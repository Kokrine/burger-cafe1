// მოკლე ხმოვანი ეფექტები Web Audio-თი (ფაილების გარეშე, ლიცენზიის პრობლემის გარეშე).
// + რბილი ფონური მელოდია, როცა კაფეს მუსიკალური ავტომატი აქვს.
import { store } from '../core/store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const ac = () => {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
};
const out = () => (ac(), master!);

/** საერთო AudioContext (ხმით კითხვისთვის — iOS-ზე შეხების შემდეგ უკვე „გახსნილია"). */
export function audioCtx(): AudioContext | null {
  try { return ac(); } catch { return null; }
}

/** ბრაუზერები (განსაკუთრებით iOS) ხმას მხოლოდ მომხმარებლის შეხების შემდეგ რთავენ. */
export function unlockAudio() {
  const unlock = () => {
    try {
      const c = ac();
      if (c.state === 'suspended') void c.resume();
      // ჩუმი ბუფერი — iOS-ის „გასაღები"
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch { /* ხმის გარეშეც მუშაობს */ }
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { once: true, passive: true });
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(out());
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** ფილტრირებული ხმაური — შიშინი, შრიალი. */
function noise(dur: number, freq: number, vol = 0.12, type: BiquadFilterType = 'bandpass') {
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out());
  src.start();
}

const sounds = {
  click: () => tone(660, 0, 0.06, 'triangle', 0.1),
  pop: () => tone(880, 0, 0.07, 'triangle', 0.14),
  coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.07, 0.22, 'square', 0.07); },
  coins: () => [0, 0.06, 0.12, 0.2].forEach((t, i) => tone(1175 + i * 120, t, 0.12, 'square', 0.05)),
  correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle', 0.15)),
  wrong: () => { tone(330, 0, 0.16, 'sine', 0.13); tone(262, 0.14, 0.24, 'sine', 0.11); },
  buy: () => { tone(784, 0, 0.1, 'triangle'); tone(1175, 0.1, 0.1, 'triangle'); tone(1568, 0.2, 0.3, 'triangle'); },
  levelUp: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'square', 0.06)),
  sizzle: () => noise(0.7, 3500, 0.16),
  ding: () => { tone(1568, 0, 0.25, 'sine', 0.13); tone(2093, 0.06, 0.3, 'sine', 0.09); },
  trash: () => noise(0.25, 600, 0.18),
  order: () => { tone(1047, 0, 0.12, 'triangle', 0.11); tone(1319, 0.1, 0.18, 'triangle', 0.11); },
  /** კარის ზარი — კლიენტი შემოვიდა */
  doorbell: () => { tone(1319, 0, 0.5, 'sine', 0.1); tone(1047, 0.18, 0.7, 'sine', 0.09); },
  /** შეკვეთის მიწოდება — „ვუშ" */
  serve: () => { noise(0.18, 1200, 0.1, 'highpass'); tone(523, 0.05, 0.12, 'triangle', 0.1, 784); },
  /** კურიერის საყვირი */
  horn: () => { tone(392, 0, 0.14, 'square', 0.06); tone(392, 0.2, 0.22, 'square', 0.06); },
  /** ახალი ბეჯი */
  badge: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.35, 'sine', 0.09)),
  /** კაფე გაიხსნა */
  open: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.1)),
  /** კაფე დაიკეტა */
  close: () => [1175, 988, 784, 523].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.09)),
  /** სტუმარი გაბრაზებული წავიდა */
  grumble: () => tone(220, 0, 0.35, 'sawtooth', 0.04, 150),
};

export type Sfx = keyof typeof sounds;

export function play(name: Sfx) {
  if (!store.get().settings.sound) return;
  try {
    sounds[name]();
  } catch {
    /* ბრაუზერი ხმას მომხმარებლის მოქმედებამდე ბლოკავს — უბრალოდ ვჩუმდებით */
  }
}

// ---------------- ფონური მელოდია (მუსიკალური ავტომატი) ----------------

const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
const BASS = [131, 131, 175, 175, 147, 147, 196, 196];
let musicTimer: ReturnType<typeof setInterval> | null = null;
let step = 0;

/** რბილი 8-ბიტიანი მელოდია (ძალიან ჩუმად) — მხოლოდ სამუშაო დღეს და თუ ხმა ჩართულია. */
export function startMusic() {
  stopMusic();
  step = 0;
  musicTimer = setInterval(() => {
    if (!store.get().settings.sound) return;
    try {
      const note = MELODY[step % MELODY.length];
      tone(note, 0, 0.22, 'triangle', 0.025);
      if (step % 2 === 0) tone(BASS[(step / 2) % BASS.length], 0, 0.4, 'sine', 0.035);
    } catch { /* */ }
    step += 1;
  }, 280);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

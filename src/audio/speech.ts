// ტექსტის ხმით წაკითხვა (განსაკუთრებით 1 კლასისთვის, ვისაც კითხვა ჯერ უჭირს).
// ქართული ხმა ბრაუზერებში თითქმის არსად არის, ამიტომ ხმას ვიღებთ Supabase-ის ფუნქციიდან
// „tts" (Microsoft Azure, ka-GE) — იხ. supabase/functions/tts. თუ ბრაუზერს ქართული ხმა აქვს,
// ის სარეზერვოდ გამოიყენება. ხმა უკრავს Web Audio-თი (iOS-ზე შეხების შემდეგ უკვე „გახსნილია").
import { audioCtx } from './sfx';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const cache = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;
let serverOff = false;
let generation = 0; // ყოველ speak()/stopSpeech()-ზე იზრდება // ფუნქცია ჯერ არ არის მორგებული (Azure-ის გასაღების გარეშე)

const kaVoice = () => globalThis.speechSynthesis?.getVoices().find((v) => /^ka/i.test(v.lang)) ?? null;

/** ხმით წაკითხვა შესაძლებელია ამ მოწყობილობაზე? */
export const speechAvailable = () => (!!URL_ && !!KEY && !serverOff) || !!kaVoice();

/** სიმბოლოები სიტყვებად — რომ ხმამ სწორად წაიკითხოს („5 ₾ × 3" → „5 ლარი გამრავლებული 3"). */
export function speakable(text: string): string {
  return text
    .replace(/₾/g, ' ლარი')
    .replace(/\s*×\s*/g, ' გამრავლებული ')
    .replace(/\s*÷\s*/g, ' გაყოფილი ')
    .replace(/\s*\+\s*/g, ' პლუს ')
    .replace(/(\d)\s*[−-]\s*(\d)/g, '$1 მინუს $2')
    .replace(/\s*=\s*/g, ' უდრის ')
    .replace(/≈\s*/g, 'დაახლოებით ')
    .replace(/[…]/g, '.')
    .replace(/[^Ⴀ-ჿ0-9\s.,!?;:()\-–—"„“'%/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

async function fetchBuffer(text: string): Promise<AudioBuffer | null> {
  const ctx = audioCtx();
  if (!URL_ || !KEY || !ctx || serverOff) return null;
  const r = await fetch(`${URL_}/functions/v1/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify({ text }),
  });
  // ფუნქცია ჯერ არ არის (404) ან Azure-ის გასაღები აკლია (503) — 🔊 ღილაკები იმალება
  if ([401, 403, 404, 503].includes(r.status)) { serverOff = true; return null; }
  if (!r.ok) return null;
  return ctx.decodeAudioData(await r.arrayBuffer());
}

export function stopSpeech() {
  generation += 1;
  try { current?.stop(); } catch { /* უკვე დასრულდა */ }
  current = null;
  globalThis.speechSynthesis?.cancel();
}

/** წაიკითხე ტექსტი. აბრუნებს false-ს, თუ ხმა ამ მოწყობილობაზე მიუწვდომელია. */
export async function speak(raw: string): Promise<boolean> {
  stopSpeech();
  const my = generation;
  const text = speakable(raw);
  if (!text) return false;
  let p = cache.get(text);
  if (!p) {
    p = fetchBuffer(text).catch(() => null);
    cache.set(text, p);
  }
  const buf = await p;
  if (my !== generation) return true; // სანამ ხმა მოვიდოდა, სხვა ტექსტი დაიწყო ან გაჩერდა
  const ctx = audioCtx();
  if (buf && ctx) {
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    current = src;
    return true;
  }
  cache.delete(text); // შეცდომა არ დავიმახსოვროთ — შემდეგ ჯერზე თავიდან ვცდით
  const v = kaVoice();
  if (v && globalThis.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.9;
    speechSynthesis.speak(u);
    return true;
  }
  return false;
}

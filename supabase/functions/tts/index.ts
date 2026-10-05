// Supabase Edge Function „tts": ქართული ტექსტი → ხმა (Microsoft Azure, ka-GE ნეირონული ხმა).
//  * Azure-ის გასაღები მხოლოდ აქ არის (Supabase → Edge Functions → Secrets):
//      AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (მაგ. westeurope), AZURE_SPEECH_VOICE (არასავალდებულო)
//  * ერთხელ წაკითხული ფრაზა ინახება Storage-ის „tts" bucket-ში — მეორედ Azure აღარ იძახება
//    (უფასო ლიმიტი იზოგება, მოსწავლეებს ხმა უფრო სწრაფად ესმით).
//  * დაცვა: მხოლოდ ქართული ასოები, ციფრები და სასვენი ნიშნები, მაქს. 400 სიმბოლო.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const KEY = Deno.env.get('AZURE_SPEECH_KEY');
const REGION = Deno.env.get('AZURE_SPEECH_REGION') ?? 'westeurope';
const VOICE = Deno.env.get('AZURE_SPEECH_VOICE') ?? 'ka-GE-EkaNeural';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ALLOWED = /^[Ⴀ-ჿ0-9\s.,!?;:()\-–—"„“'%/]+$/;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const audio = (body: BodyInit) =>
  new Response(body, { headers: { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' } });

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!KEY) return json({ error: 'not-configured' }, 503);

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  if (!text || text.length > 400 || !ALLOWED.test(text)) return json({ error: 'bad-text' }, 400);

  const path = `${VOICE}/${await sha256(`${VOICE}|${text}`)}.mp3`;
  const { data: cached } = await sb.storage.from('tts').download(path);
  if (cached) return audio(cached);

  const ssml = `<speak version="1.0" xml:lang="ka-GE"><voice name="${VOICE}"><prosody rate="-8%">${escapeXml(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'burger-cafe',
    },
    body: ssml,
  });
  if (!r.ok) return json({ error: 'tts-failed', status: r.status }, 502);
  const mp3 = new Uint8Array(await r.arrayBuffer());
  await sb.storage.from('tts').upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
  return audio(mp3);
});

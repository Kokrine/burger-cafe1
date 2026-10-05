// რომელი მონაცემების ფენა მუშაობს: თუ build-ს Supabase-ის მისამართი და გასაღები აქვს
// (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — იხ. .env.production) → ღრუბელი, თორემ ოფლაინ.
import type { Backend } from './backend';
import { OfflineBackend } from './offline';
import { SupabaseBackend } from './supabase';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const offline = url && key ? null : new OfflineBackend(localStorage);

export const backend: Backend = offline ?? new SupabaseBackend(url!, key!, localStorage);

/** პირველ გაშვებაზე — დემო კლასი (მხოლოდ ოფლაინ რეჟიმში). */
export const prepareBackend = async () => { await offline?.seedDemo(); };

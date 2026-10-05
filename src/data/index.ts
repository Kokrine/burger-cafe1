// რომელი მონაცემების ფენა მუშაობს. Supabase-ის მიერთებისას აქ დაემატება:
//   import.meta.env.VITE_SUPABASE_URL ? new SupabaseBackend(...) : new OfflineBackend(localStorage)
import type { Backend } from './backend';
import { OfflineBackend } from './offline';

const offline = new OfflineBackend(localStorage);
export const backend: Backend = offline;

/** პირველ გაშვებაზე — დემო კლასი (მხოლოდ ოფლაინ რეჟიმში). */
export const prepareBackend = () => offline.seedDemo();

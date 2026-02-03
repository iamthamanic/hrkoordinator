/**
 * Supabase-Konfiguration (lokal)
 * Liest URL und Anon Key aus Umgebungsvariablen. Keine Cloud-Daten im Code.
 *
 * Lokal: .env mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (von `supabase start`).
 */

const env = typeof import.meta !== 'undefined' ? import.meta.env : ({} as Record<string, string>);

/** Basis-URL der Supabase-API (lokal oder über Env). */
export const supabaseUrl =
  env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

/** Öffentlicher Anon Key (von .env / `supabase start`). */
export const publicAnonKey =
  env.VITE_SUPABASE_ANON_KEY || '';

/** Für Kompatibilität: "local" bei lokaler URL, sonst aus URL abgeleitet. */
export const projectId =
  supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')
    ? 'local'
    : (() => {
        try {
          return new URL(supabaseUrl).hostname.split('.')[0] || 'local';
        } catch {
          return 'local';
        }
      })();

if (typeof window !== 'undefined' && !publicAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_ANON_KEY fehlt. Bitte .env anlegen und Anon Key von `supabase start` eintragen.'
  );
}

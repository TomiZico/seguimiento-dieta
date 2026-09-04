import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Configuralas en .env.local (ver README).",
  );
}

// Si faltan las variables, usamos una URL válida-pero-inerte en vez de una
// vacía: createClient() tira una excepción sincrónica con una URL vacía, lo
// que rompe el render de toda la app (pantalla en blanco). Con esta, el
// cliente se crea sin problema y cada pedido falla de forma controlada más
// tarde, mostrando el banner de configuración en vez de una pantalla vacía.
export const supabase = createClient(
  url || "https://misconfigured.invalid.supabase.co",
  anonKey || "misconfigured",
  {
    auth: {
      // Explícito (son los defaults, pero así queda claro): la sesión se
      // guarda en localStorage y se renueva sola, para no tener que volver a
      // iniciar sesión cada vez que se abre la app instalada.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);

import { supabase } from "./supabase";

/** Detecta la zona horaria del dispositivo y la guarda, para que los avisos
 * push le lleguen a cada usuario en su propio horario local. Se llama una
 * vez por sesión iniciada; si falla no bloquea nada más de la app. */
export async function syncDeviceTimezone(): Promise<void> {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    await supabase.from("user_profiles").upsert({ timezone }, { onConflict: "user_id" });
  } catch {
    // best-effort: si falla, la función de avisos usa el default.
  }
}

// Edge Function: busca las comidas de hoy cuyo aviso ya corresponde enviar
// (horario - minutos de anticipación <= ahora) y todavía no fueron
// notificadas, les manda un push a todas las suscripciones guardadas, y las
// marca como notificadas. Pensada para correr cada minuto vía pg_cron
// (ver supabase/migrations/0002_cron.sql).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:no-reply@example.com";

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

const MEAL_LABELS: Record<string, string> = {
  desayuno: "Desayuno",
  media_manana: "Colación de media mañana",
  almuerzo: "Almuerzo",
  media_tarde: "Colación de media tarde",
  merienda: "Merienda",
  cena: "Cena",
};

/** Fecha (yyyy-mm-dd) y minutos desde medianoche de `date` en la zona `timeZone`. */
function localDateAndMinutes(date: Date, timeZone: string): { isoDate: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  // Rango amplio en UTC (±1 día) para no perderse comidas de usuarios en
  // cualquier huso horario; el filtro fino por fecha/hora local de cada
  // usuario se hace después, en memoria.
  const rangeStart = new Date(now.getTime() - 26 * 60 * 60000).toISOString().slice(0, 10);
  const rangeEnd = new Date(now.getTime() + 26 * 60 * 60000).toISOString().slice(0, 10);

  // La función corre con la service role key, que ignora RLS: acá se procesan
  // las comidas de TODOS los usuarios en una sola pasada, agrupando por
  // user_id para mandarle a cada uno sus propios avisos con sus propias
  // suscripciones, su propia configuración y su propia zona horaria.
  const [{ data: profileRows, error: profilesError }, { data: settingsRows, error: settingsError }] =
    await Promise.all([
      supabase.from("user_profiles").select("user_id, timezone"),
      supabase.from("notification_settings").select("user_id, meal_type, lead_minutes, enabled"),
    ]);
  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
  }
  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 });
  }
  const timezoneByUser = new Map((profileRows ?? []).map((p) => [p.user_id, p.timezone]));
  const leadByUserAndType = new Map(settingsRows.map((s) => [`${s.user_id}:${s.meal_type}`, s]));

  const { data: meals, error: mealsError } = await supabase
    .from("meals")
    .select("id, user_id, meal_type, food, time, date")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .eq("status", "pendiente")
    .is("notified_at", null);
  if (mealsError) {
    return new Response(JSON.stringify({ error: mealsError.message }), { status: 500 });
  }

  const due = (meals ?? []).filter((meal) => {
    const setting = leadByUserAndType.get(`${meal.user_id}:${meal.meal_type}`);
    if (!setting || !setting.enabled) return false;

    const timeZone = timezoneByUser.get(meal.user_id) ?? DEFAULT_TIMEZONE;
    const { isoDate: localToday, minutes: nowMinutes } = localDateAndMinutes(now, timeZone);
    if (meal.date !== localToday) return false;

    const [h, m] = String(meal.time).split(":").map(Number);
    const mealMinutes = (h ?? 0) * 60 + (m ?? 0);
    const notifyAtMinutes = mealMinutes - setting.lead_minutes;
    // Se envía en la ventana [notifyAt, notifyAt + 5min] para no perder avisos
    // si el cron se atrasó un poco, y sin repetir viejos tras una caída larga.
    return nowMinutes >= notifyAtMinutes && nowMinutes <= notifyAtMinutes + 5;
  });

  if (due.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500 });
  }
  const subsByUser = new Map<string, typeof subs>();
  for (const sub of subs ?? []) {
    if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, []);
    subsByUser.get(sub.user_id)!.push(sub);
  }

  let sent = 0;
  for (const meal of due) {
    const payload = JSON.stringify({
      title: `${MEAL_LABELS[meal.meal_type] ?? meal.meal_type} a las ${meal.time.slice(0, 5)}`,
      body: meal.food || "Revisá tu dieta de hoy.",
      mealId: meal.id,
    });

    for (const sub of subsByUser.get(meal.user_id) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Suscripción vencida/inválida: la borramos.
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", sub.user_id)
            .eq("endpoint", sub.endpoint);
        } else {
          console.error("push error", err);
        }
      }
    }

    await supabase
      .from("meals")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", meal.id);
  }

  return new Response(JSON.stringify({ sent, mealsProcessed: due.length }), { status: 200 });
});

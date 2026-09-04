// Edge Function que ejecuta las acciones rápidas de una notificación push
// (Comido / Posponer 15 min / Saltear), tocadas con la app cerrada. El
// service worker no tiene la sesión del usuario (no puede acceder al
// localStorage de la pestaña), así que no puede pasar las policies de RLS
// por sí solo — por eso esto corre server-side con la service role key,
// igual que send-due-notifications. Se identifica la comida por su id
// (uuid impredecible, que solo le llegó a este dispositivo dentro del
// payload de su propia notificación), no por usuario.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ACTIONS = new Set(["comido", "saltear", "posponer"]);

// Se llama con fetch() desde el service worker (origen del navegador), a
// diferencia de send-due-notifications que solo la llama pg_net del lado
// del servidor. Content-Type: application/json hace que el navegador mande
// un preflight OPTIONS, así que hay que responderlo y mandar CORS en todas
// las respuestas o el navegador descarta la respuesta real.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { mealId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido" }, 400);
  }

  const { mealId, action } = body;
  if (!mealId || !action || !ACTIONS.has(action)) {
    return jsonResponse({ error: "Parámetros inválidos" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (action === "posponer") {
    const { data, error } = await supabase
      .from("meals")
      .select("time")
      .eq("id", mealId)
      .single();
    if (error || !data) {
      return jsonResponse({ error: error?.message ?? "no encontrada" }, 404);
    }
    const [h, m] = String(data.time).split(":").map(Number);
    const total = ((h ?? 0) * 60 + (m ?? 0) + 15) % 1440;
    const newTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    const { error: updateError } = await supabase
      .from("meals")
      .update({ time: newTime, notified_at: null })
      .eq("id", mealId);
    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }
    return jsonResponse({ ok: true }, 200);
  }

  const status = action === "comido" ? "comido" : "salteado";
  const { error } = await supabase.from("meals").update({ status }).eq("id", mealId);
  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ ok: true }, 200);
});

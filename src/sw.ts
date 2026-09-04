/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

interface PushPayload {
  title: string;
  body: string;
  mealId: string;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload: PushPayload = {
    title: "Es hora de comer",
    body: "Revisá tu dieta de hoy.",
    mealId: "",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload no es JSON válido, usamos el default
  }

  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: payload.body,
    tag: payload.mealId || undefined,
    data: { mealId: payload.mealId },
    actions: [
      { action: "comido", title: "Comido" },
      { action: "posponer", title: "Posponer 15 min" },
      { action: "saltear", title: "Saltear" },
    ],
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// El service worker no tiene la sesión del usuario logueado (no puede leer
// el localStorage de la pestaña), así que las acciones rápidas de la
// notificación pasan por una Edge Function con service role en vez de
// pegarle directo a /rest/v1 — de otro modo las policies de RLS las
// bloquearían por no llevar un JWT de usuario válido.
async function callMealAction(mealId: string, action: "comido" | "saltear" | "posponer"): Promise<void> {
  if (!SUPABASE_URL || !mealId) return;
  await fetch(`${SUPABASE_URL}/functions/v1/meal-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mealId, action }),
  });
}

async function focusOrOpenApp(): Promise<void> {
  const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = clientsList.find((c) => "focus" in c) as WindowClient | undefined;
  if (existing) {
    await existing.focus();
    existing.navigate("/");
  } else {
    await self.clients.openWindow("/");
  }
}

self.addEventListener("notificationclick", (event) => {
  const mealId = (event.notification.data as { mealId?: string } | undefined)?.mealId ?? "";
  event.notification.close();

  event.waitUntil(
    (async () => {
      if (event.action === "comido" || event.action === "saltear" || event.action === "posponer") {
        await callMealAction(mealId, event.action);
      } else {
        await focusOrOpenApp();
      }
    })(),
  );
});

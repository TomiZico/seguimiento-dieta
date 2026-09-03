/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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

async function patchMeal(id: string, body: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !id) return;
  await fetch(`${SUPABASE_URL}/rest/v1/meals?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function postponeFifteenMinutes(id: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !id) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/meals?id=eq.${id}&select=time`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const rows = (await res.json()) as { time: string }[];
  const time = rows[0]?.time;
  if (!time) return;
  const [h, m] = time.split(":").map(Number);
  const total = ((h ?? 0) * 60 + (m ?? 0) + 15) % 1440;
  const newTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  await patchMeal(id, { time: newTime, notified_at: null });
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
      if (event.action === "comido") {
        await patchMeal(mealId, { status: "comido" });
      } else if (event.action === "saltear") {
        await patchMeal(mealId, { status: "salteado" });
      } else if (event.action === "posponer") {
        await postponeFifteenMinutes(mealId);
      } else {
        await focusOrOpenApp();
      }
    })(),
  );
});

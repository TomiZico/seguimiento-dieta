import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { fetchNotificationSettings, upsertNotificationSetting } from "@/lib/settingsService";
import {
  getExistingSubscription,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { MEAL_TYPE_LABELS, type NotificationSetting } from "@/lib/types";

const LEAD_OPTIONS = [15, 30, 45, 60, 90, 120];

export function ConfiguracionPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchNotificationSettings()
      .then(setSettings)
      .catch(() => {});
    getExistingSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const handleLeadChange = async (setting: NotificationSetting, lead_minutes: number) => {
    const updated = { ...setting, lead_minutes };
    setSettings((prev) => prev.map((s) => (s.meal_type === setting.meal_type ? updated : s)));
    try {
      await upsertNotificationSetting(updated);
    } catch (err) {
      toast.error("No pude guardar el ajuste", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleToggleEnabled = async (setting: NotificationSetting) => {
    const updated = { ...setting, enabled: !setting.enabled };
    setSettings((prev) => prev.map((s) => (s.meal_type === setting.meal_type ? updated : s)));
    try {
      await upsertNotificationSetting(updated);
    } catch (err) {
      toast.error("No pude guardar el ajuste", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleToggleSubscription = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast.success("Avisos desactivados");
      } else {
        await subscribeToPush();
        setSubscribed(true);
        toast.success("Avisos activados", {
          description: "Te vamos a avisar antes de cada comida.",
        });
      }
    } catch (err) {
      toast.error("No pude activar los avisos", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <button
        type="button"
        onClick={handleToggleSubscription}
        disabled={busy || !pushSupported()}
        className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md text-sm font-medium ring-1 transition-colors disabled:opacity-40 ${
          subscribed
            ? "bg-primary/15 text-primary ring-primary/30"
            : "bg-foreground/5 text-muted-foreground ring-border hover:text-foreground"
        }`}
      >
        {subscribed ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        {!pushSupported()
          ? "Tu navegador no admite notificaciones push"
          : subscribed
            ? "Avisos activados — tocá para desactivar"
            : "Activar avisos antes de cada comida"}
      </button>

      <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Aviso antes de cada tipo de comida
      </p>
      <div className="mt-3 space-y-2">
        {settings.map((setting) => (
          <div key={setting.meal_type} className="rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">{MEAL_TYPE_LABELS[setting.meal_type]}</span>
              <button
                type="button"
                onClick={() => handleToggleEnabled(setting)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                  setting.enabled
                    ? "bg-primary/15 text-primary ring-primary/30"
                    : "text-muted-foreground ring-border"
                }`}
              >
                {setting.enabled ? "Activo" : "Silenciado"}
              </button>
            </div>
            <select
              value={setting.lead_minutes}
              onChange={(e) => handleLeadChange(setting, Number(e.target.value))}
              disabled={!setting.enabled}
              className="mt-2 min-h-[40px] w-full rounded-md bg-foreground/5 px-2 text-sm ring-1 ring-border disabled:opacity-40"
            >
              {LEAD_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {min} minutos antes
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

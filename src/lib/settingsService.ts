import { supabase } from "./supabase";
import { MEAL_TYPES, type NotificationSetting } from "./types";

const DEFAULT_LEAD_MINUTES = 60;

export async function fetchNotificationSettings(): Promise<NotificationSetting[]> {
  const { data, error } = await supabase.from("notification_settings").select("*");
  if (error) throw error;

  const byType = new Map(data?.map((row) => [row.meal_type, row]));
  return MEAL_TYPES.map(
    (meal_type) =>
      byType.get(meal_type) ?? {
        meal_type,
        lead_minutes: DEFAULT_LEAD_MINUTES,
        enabled: true,
      },
  );
}

export async function upsertNotificationSetting(setting: NotificationSetting): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .upsert(setting, { onConflict: "user_id,meal_type" });
  if (error) throw error;
}

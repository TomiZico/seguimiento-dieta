export const MEAL_TYPES = [
  "desayuno",
  "media_manana",
  "almuerzo",
  "media_tarde",
  "merienda",
  "cena",
] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: "Desayuno",
  media_manana: "Colación (media mañana)",
  almuerzo: "Almuerzo",
  media_tarde: "Colación (media tarde)",
  merienda: "Merienda",
  cena: "Cena",
};

export const MEAL_STATUSES = ["pendiente", "comido", "salteado"] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];

export interface Meal {
  id: string;
  date: string; // yyyy-mm-dd
  meal_type: MealType;
  food: string;
  time: string; // HH:mm
  status: MealStatus;
  notified_at: string | null;
  created_at: string;
}

/** Comida recién parseada de un archivo, todavía no guardada. */
export interface DraftMeal {
  date: string;
  meal_type: MealType;
  food: string;
  time: string;
}

export interface NotificationSetting {
  meal_type: MealType;
  lead_minutes: number;
  enabled: boolean;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

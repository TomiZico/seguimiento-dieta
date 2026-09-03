import type { Meal } from "./types";

export interface AdherenceStats {
  total: number;
  comidas: number;
  salteadas: number;
  pendientes: number;
  /** Comidas cumplidas sobre el total ya definido (excluye pendientes futuros del cálculo de "definidas"). */
  percent: number;
}

export function computeAdherence(meals: Meal[]): AdherenceStats {
  const total = meals.length;
  const comidas = meals.filter((m) => m.status === "comido").length;
  const salteadas = meals.filter((m) => m.status === "salteado").length;
  const pendientes = meals.filter((m) => m.status === "pendiente").length;
  const decided = comidas + salteadas;
  const percent = decided === 0 ? 0 : Math.round((comidas / decided) * 100);
  return { total, comidas, salteadas, pendientes, percent };
}

export function groupAdherenceByDay(meals: Meal[]): { date: string; percent: number }[] {
  const byDate = new Map<string, Meal[]>();
  for (const m of meals) {
    if (!byDate.has(m.date)) byDate.set(m.date, []);
    byDate.get(m.date)!.push(m);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMeals]) => ({ date, percent: computeAdherence(dayMeals).percent }));
}

import { supabase } from "./supabase";
import type { DraftMeal, Meal, MealStatus } from "./types";

export async function fetchMealsForDate(date: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMealsInRange(startDate: string, endDate: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertDraftMeals(drafts: DraftMeal[]): Promise<void> {
  if (drafts.length === 0) return;
  const rows = drafts.map((d) => ({ ...d, status: "pendiente" as MealStatus }));
  const { error } = await supabase.from("meals").insert(rows);
  if (error) throw error;
}

export async function deleteMealsInMonth(monthStart: string, monthEnd: string): Promise<void> {
  const { error } = await supabase
    .from("meals")
    .delete()
    .gte("date", monthStart)
    .lte("date", monthEnd);
  if (error) throw error;
}

export async function updateMealStatus(id: string, status: MealStatus): Promise<void> {
  const { error } = await supabase.from("meals").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateMeal(id: string, patch: Partial<DraftMeal>): Promise<void> {
  const { error } = await supabase.from("meals").update(patch).eq("id", id);
  if (error) throw error;
}

export async function postponeMeal(id: string, minutes: number): Promise<void> {
  const { data, error } = await supabase.from("meals").select("time").eq("id", id).single();
  if (error) throw error;
  const [h, m] = String(data.time).split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const newTime = `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
  const { error: updateError } = await supabase
    .from("meals")
    .update({ time: newTime, notified_at: null })
    .eq("id", id);
  if (updateError) throw updateError;
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchMealsForDate, updateMealStatus } from "@/lib/dietService";
import { formatDateLong, todayISO } from "@/lib/date";
import { MealCard } from "@/components/MealCard";
import type { Meal, MealStatus } from "@/lib/types";

export function HoyPage() {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const today = todayISO();

  const load = async () => {
    try {
      setMeals(await fetchMealsForDate(today));
    } catch (err) {
      toast.error("No pude cargar las comidas de hoy", {
        description: err instanceof Error ? err.message : String(err),
      });
      setMeals([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (meal: Meal, status: MealStatus) => {
    const previousStatus = meal.status;
    setMeals((prev) => prev?.map((m) => (m.id === meal.id ? { ...m, status } : m)) ?? prev);
    try {
      await updateMealStatus(meal.id, status);
    } catch (err) {
      toast.error("No pude guardar el cambio", {
        description: err instanceof Error ? err.message : String(err),
      });
      load();
      return;
    }

    if (status !== "pendiente" && status !== previousStatus) {
      const label = status === "comido" ? "Comido" : "Salteado";
      toast(`${label}${meal.food ? `: ${meal.food}` : ""}`, {
        action: {
          label: "Deshacer",
          onClick: () => handleStatusChange({ ...meal, status }, previousStatus),
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <p className="text-sm capitalize text-muted-foreground">{formatDateLong(today)}</p>

      <div className="mt-4 space-y-3">
        {meals === null && (
          <p className="rounded-xl bg-card/60 p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            Cargando…
          </p>
        )}
        {meals?.length === 0 && (
          <p className="rounded-xl bg-card/60 p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No tenés comidas cargadas para hoy. Subí tu dieta desde el ícono de arriba.
          </p>
        )}
        {meals?.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onStatusChange={(status) => handleStatusChange(meal, status)}
          />
        ))}
      </div>
    </div>
  );
}

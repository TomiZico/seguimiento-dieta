import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { fetchMealsInRange, insertDraftMeals, deleteMeal, updateMeal } from "@/lib/dietService";
import {
  formatDateLong,
  monthCalendarCells,
  monthLabel,
  monthRange,
  todayISO,
  weekRange,
} from "@/lib/date";
import { EditableMealRow } from "@/components/EditableMealRow";
import type { Meal } from "@/lib/types";

type ViewMode = "mes" | "semana";

export function CalendarioPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("mes");
  const [cursor, setCursor] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const range = viewMode === "mes" ? monthRange(cursor) : weekRange(cursor);

  const load = async () => {
    try {
      setMeals(await fetchMealsInRange(range.start, range.end));
    } catch (err) {
      toast.error("No pude cargar el calendario", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, cursor]);

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of meals) {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    }
    return map;
  }, [meals]);

  const cells = viewMode === "mes" ? monthCalendarCells(cursor) : weekCells(cursor);
  const selectedMeals = (mealsByDate.get(selectedDate) ?? []).sort((a, b) =>
    a.time.localeCompare(b.time),
  );

  const shift = (delta: number) => {
    const next = new Date(cursor);
    if (viewMode === "mes") next.setMonth(next.getMonth() + delta);
    else next.setDate(next.getDate() + delta * 7);
    setCursor(next);
  };

  const handleSave = async (
    id: string,
    patch: { time: string; food: string; meal_type: Meal["meal_type"] },
  ) => {
    try {
      await updateMeal(id, patch);
      toast.success("Comida actualizada");
      load();
    } catch (err) {
      toast.error("No pude guardar", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeal(id);
      toast.success("Comida eliminada");
      load();
    } catch (err) {
      toast.error("No pude eliminar", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleAdd = async () => {
    try {
      await insertDraftMeals([
        { date: selectedDate, meal_type: "almuerzo", food: "", time: "13:00" },
      ]);
      load();
    } catch (err) {
      toast.error("No pude agregar la comida", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMode((v) => (v === "mes" ? "semana" : "mes"))}
          className="rounded-md bg-foreground/5 px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          Vista: {viewMode === "mes" ? "Mes" : "Semana"}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Anterior"
            className="grid size-8 place-items-center rounded-md text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium capitalize">
            {viewMode === "mes"
              ? monthLabel(cursor)
              : `Semana del ${weekRange(cursor).start.slice(8, 10)}`}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Siguiente"
            className="grid size-8 place-items-center rounded-md text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const count = mealsByDate.get(date)?.length ?? 0;
          const isSelected = date === selectedDate;
          const isToday = date === todayISO();
          const dayNum = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ring-1 transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground ring-primary"
                  : isToday
                    ? "ring-primary/50 text-foreground"
                    : "text-foreground ring-transparent hover:ring-border"
              }`}
            >
              <span>{dayNum}</span>
              {count > 0 && (
                <span
                  className={`mt-0.5 size-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize">{formatDateLong(selectedDate)}</p>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 rounded-md bg-foreground/5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Agregar
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {selectedMeals.length === 0 && (
            <p className="rounded-xl bg-card/60 p-4 text-center text-sm text-muted-foreground ring-1 ring-border">
              Sin comidas cargadas este día.
            </p>
          )}
          {selectedMeals.map((meal) => (
            <EditableMealRow
              key={meal.id}
              meal={meal}
              onSave={(patch) => handleSave(meal.id, patch)}
              onDelete={() => handleDelete(meal.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function weekCells(d: Date): string[] {
  const { start } = weekRange(d);
  const first = new Date(start + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(first);
    day.setDate(first.getDate() + i);
    const off = day.getTimezoneOffset();
    return new Date(day.getTime() - off * 60000).toISOString().slice(0, 10);
  });
}

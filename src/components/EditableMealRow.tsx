import { useState } from "react";
import { Trash2 } from "lucide-react";
import { MEAL_TYPE_LABELS, MEAL_TYPES, type Meal } from "@/lib/types";

export function EditableMealRow({
  meal,
  onSave,
  onDelete,
}: {
  meal: Meal;
  onSave: (patch: { time: string; food: string; meal_type: Meal["meal_type"] }) => void;
  onDelete: () => void;
}) {
  const [time, setTime] = useState(meal.time);
  const [food, setFood] = useState(meal.food);
  const [mealType, setMealType] = useState(meal.meal_type);
  const dirty = time !== meal.time || food !== meal.food || mealType !== meal.meal_type;

  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="min-h-[40px] w-28 rounded-md bg-foreground/5 px-2 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as Meal["meal_type"])}
          className="min-h-[40px] flex-1 rounded-md bg-foreground/5 px-2 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {MEAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {MEAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Eliminar comida"
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground/60 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <input
        type="text"
        value={food}
        onChange={(e) => setFood(e.target.value)}
        placeholder="Alimento / plato"
        className="mt-2 min-h-[40px] w-full rounded-md bg-foreground/5 px-3 text-sm ring-1 ring-border placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => onSave({ time, food, meal_type: mealType })}
          className="mt-2 w-full rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Guardar cambios
        </button>
      )}
    </div>
  );
}

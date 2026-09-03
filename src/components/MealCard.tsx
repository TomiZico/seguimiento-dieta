import { Check, Clock, X } from "lucide-react";
import { MEAL_TYPE_LABELS, type Meal, type MealStatus } from "@/lib/types";

const STATUS_STYLES: Record<MealStatus, string> = {
  pendiente: "bg-foreground/5 text-muted-foreground ring-border",
  comido: "bg-primary/15 text-primary ring-primary/30",
  salteado: "bg-danger/10 text-danger ring-danger/25",
};

export function MealCard({
  meal,
  onStatusChange,
  onEdit,
}: {
  meal: Meal;
  onStatusChange: (status: MealStatus) => void;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`rounded-xl bg-card p-4 ring-1 transition-opacity ${
        meal.status === "salteado" ? "opacity-60" : "ring-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="font-mono">{meal.time}</span>
            <span className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">
              {MEAL_TYPE_LABELS[meal.meal_type]}
            </span>
          </div>
          <p
            className={`mt-1.5 text-sm ${meal.status === "salteado" ? "line-through text-muted-foreground" : "text-foreground"}`}
          >
            {meal.food}
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onStatusChange(meal.status === "comido" ? "pendiente" : "comido")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ring-1 transition-colors ${
            meal.status === "comido"
              ? STATUS_STYLES.comido
              : "text-muted-foreground ring-border hover:text-foreground"
          }`}
        >
          <Check className="size-3.5" />
          Comido
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(meal.status === "salteado" ? "pendiente" : "salteado")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ring-1 transition-colors ${
            meal.status === "salteado"
              ? STATUS_STYLES.salteado
              : "text-muted-foreground ring-border hover:text-foreground"
          }`}
        >
          <X className="size-3.5" />
          Salteado
        </button>
      </div>
    </div>
  );
}

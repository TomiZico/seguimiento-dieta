import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Clock, X } from "lucide-react";
import { MEAL_TYPE_LABELS, type Meal, type MealStatus } from "@/lib/types";

const STATUS_STYLES: Record<MealStatus, string> = {
  pendiente: "bg-foreground/5 text-muted-foreground ring-border",
  comido: "bg-primary/15 text-primary ring-primary/30",
  salteado: "bg-danger/10 text-danger ring-danger/25",
};

const SWIPE_THRESHOLD = 72;
const SWIPE_MAX = 120;

export function MealCard({
  meal,
  onStatusChange,
  onEdit,
}: {
  meal: Meal;
  onStatusChange: (status: MealStatus) => void;
  onEdit?: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axisLocked = useRef<"x" | "y" | null>(null);
  const passedThreshold = useRef(false);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    axisLocked.current = null;
    passedThreshold.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!axisLocked.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axisLocked.current !== "x") return;
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
    setDragX(clamped);
    const past = Math.abs(clamped) >= SWIPE_THRESHOLD;
    if (past && !passedThreshold.current) navigator.vibrate?.(10);
    passedThreshold.current = past;
  };

  const handlePointerUp = () => {
    if (!start.current) return;
    start.current = null;
    axisLocked.current = null;
    setDragging(false);
    if (dragX >= SWIPE_THRESHOLD) {
      onStatusChange(meal.status === "comido" ? "pendiente" : "comido");
    } else if (dragX <= -SWIPE_THRESHOLD) {
      onStatusChange(meal.status === "salteado" ? "pendiente" : "salteado");
    }
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        aria-hidden
        className={`absolute inset-0 flex items-center justify-between px-5 text-xs font-medium ${
          dragX > 8 ? "bg-primary/15 text-primary" : dragX < -8 ? "bg-danger/10 text-danger" : ""
        }`}
      >
        <span
          className={`flex items-center gap-1.5 transition-opacity ${dragX > 8 ? "opacity-100" : "opacity-0"}`}
        >
          <Check className="size-4" /> Comido
        </span>
        <span
          className={`flex items-center gap-1.5 transition-opacity ${dragX < -8 ? "opacity-100" : "opacity-0"}`}
        >
          Salteado <X className="size-4" />
        </span>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={`relative touch-pan-y rounded-xl bg-card p-4 ring-1 ${
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
    </div>
  );
}

import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { parseDietFile } from "@/lib/mealParsers";
import { deleteMealsInMonth, fetchMealsInRange, insertDraftMeals } from "@/lib/dietService";
import { formatDateLong, monthRange } from "@/lib/date";
import { MEAL_TYPE_LABELS, MEAL_TYPES, type DraftMeal } from "@/lib/types";

type Step = "subir" | "revisar";

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SubirDietaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("subir");
  const [monthValue, setMonthValue] = useState(monthInputValue(new Date()));
  const [processing, setProcessing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftMeal[]>([]);
  const [saving, setSaving] = useState(false);

  const targetMonth = useMemo(() => {
    const [y, m] = monthValue.split("-").map(Number);
    return new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, 1);
  }, [monthValue]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcessing(true);
    try {
      const result = await parseDietFile(file, targetMonth);
      if (result.meals.length === 0) {
        toast.error("No pude interpretar ninguna comida del archivo", {
          description: result.warnings[0] ?? "Revisá el formato del archivo.",
        });
        setWarnings(result.warnings);
        return;
      }
      setDrafts(
        result.meals.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
      );
      setWarnings(result.warnings);
      setStep("revisar");
    } finally {
      setProcessing(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, DraftMeal[]>();
    for (const d of drafts) {
      if (!map.has(d.date)) map.set(d.date, []);
      map.get(d.date)!.push(d);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [drafts]);

  const updateDraft = (index: number, patch: Partial<DraftMeal>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const addDraft = (date: string) => {
    setDrafts((prev) => [...prev, { date, meal_type: "almuerzo", food: "", time: "13:00" }]);
  };

  const confirm = async () => {
    if (drafts.length === 0) {
      toast.error("No hay comidas para guardar");
      return;
    }
    const range = monthRange(targetMonth);
    try {
      const existing = await fetchMealsInRange(range.start, range.end);
      if (existing.length > 0) {
        const ok = window.confirm(
          `Ya tenés ${existing.length} comidas cargadas para ese mes. Confirmar reemplaza todo ese mes por esta dieta nueva. ¿Continuar?`,
        );
        if (!ok) return;
      }
    } catch {
      // si falla la verificación, seguimos igual: insertDraftMeals abajo mostrará el error real si lo hay
    }

    setSaving(true);
    try {
      await deleteMealsInMonth(range.start, range.end);
      await insertDraftMeals(drafts);
      toast.success("Dieta guardada", { description: `${drafts.length} comidas cargadas.` });
      navigate("/");
    } catch (err) {
      toast.error("No pude guardar la dieta", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  if (step === "subir") {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <p className="text-sm text-muted-foreground">
          Subí un archivo con tu dieta mensual (columnas Día, Comida, Alimento y Horario) en CSV,
          Excel o PDF. La vamos a organizar en un calendario para que la revises antes de guardarla.
        </p>

        <label className="mt-6 block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Mes de la dieta
        </label>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="mt-2 min-h-[44px] w-full rounded-md bg-foreground/5 px-3 text-base ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <label
          htmlFor="diet-file-input"
          className={`mt-6 flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 ${
            processing ? "opacity-50" : "cursor-pointer"
          }`}
        >
          <FileUp className="size-6" />
          {processing ? "Procesando…" : "Tocá para elegir un archivo (.csv, .xlsx, .pdf)"}
        </label>
        <input
          id="diet-file-input"
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={handleFile}
          disabled={processing}
          className="sr-only"
        />

        {warnings.length > 0 && (
          <div className="mt-4 space-y-1 rounded-xl bg-warning/10 p-3 text-xs text-warning ring-1 ring-warning/30">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-4">
      <p className="text-sm font-medium">Así interpretamos tu dieta</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Revisá y corregí lo que haga falta antes de confirmar. {drafts.length} comidas en{" "}
        {grouped.length} días.
      </p>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1 rounded-xl bg-warning/10 p-3 text-xs text-warning ring-1 ring-warning/30">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {grouped.map(([date, dayDrafts]) => (
          <div key={date}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium capitalize text-muted-foreground">
                {formatDateLong(date)}
              </p>
              <button
                type="button"
                onClick={() => addDraft(date)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                Agregar
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {dayDrafts.map((draft) => {
                const globalIndex = drafts.indexOf(draft);
                return (
                  <div key={globalIndex} className="rounded-xl bg-card p-3 ring-1 ring-border">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(e) => updateDraft(globalIndex, { time: e.target.value })}
                        className="min-h-[40px] w-28 rounded-md bg-foreground/5 px-2 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={draft.meal_type}
                        onChange={(e) =>
                          updateDraft(globalIndex, {
                            meal_type: e.target.value as DraftMeal["meal_type"],
                          })
                        }
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
                        onClick={() => removeDraft(globalIndex)}
                        aria-label="Quitar comida"
                        className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground/60 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={draft.food}
                      onChange={(e) => updateDraft(globalIndex, { food: e.target.value })}
                      placeholder="Alimento / plato"
                      className="mt-2 min-h-[40px] w-full rounded-md bg-foreground/5 px-3 text-sm ring-1 ring-border placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => setStep("subir")}
            className="min-h-[44px] flex-1 rounded-md bg-foreground/5 text-sm font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="min-h-[44px] flex-[2] rounded-md bg-primary text-sm font-medium text-primary-foreground ring-1 ring-primary/60 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Confirmar y guardar dieta"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { normalize } from "./text";
import type { MealType } from "./types";

const ALIASES: [MealType, string[]][] = [
  ["desayuno", ["desayuno", "breakfast"]],
  ["almuerzo", ["almuerzo", "lunch"]],
  ["merienda", ["merienda", "te"]],
  ["cena", ["cena", "dinner"]],
  [
    "media_manana",
    ["colacion manana", "colacion am", "snack manana", "media manana", "colacion 1"],
  ],
  ["media_tarde", ["colacion tarde", "colacion pm", "snack tarde", "media tarde", "colacion 2"]],
];

/**
 * Interpreta el valor de la columna "Comida" (desayuno, almuerzo, colación, etc.)
 * `occurrenceHint` desambigua una "colación" sin calificar: la primera del día
 * se toma como media mañana, la segunda como media tarde.
 */
export function matchMealType(raw: string, colacionOccurrence = 0): MealType | null {
  const n = normalize(raw);
  if (!n) return null;

  for (const [type, aliases] of ALIASES) {
    if (aliases.some((a) => n.includes(a))) return type;
  }

  if (n.includes("colacion") || n.includes("snack")) {
    return colacionOccurrence === 0 ? "media_manana" : "media_tarde";
  }

  // último recurso: "comida" sola suele usarse como almuerzo en varios países.
  if (n === "comida") return "almuerzo";

  return null;
}

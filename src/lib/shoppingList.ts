import type { Meal } from "./types";

// Separa la descripción libre de una comida ("2 porc. Carne con ensalada +
// arroz. Fruta") en ítems sueltos. Es heurístico, no un parser de recetas:
// la lista sirve como punto de partida, no como resultado final.
const SPLIT_REGEX = /,|\+|\.(?!\d)|\by\b/gi;

// El orden importa: la alternancia de regex prueba las opciones en orden y
// se queda con la primera que matchea (no la más larga), así que las formas
// más largas van primero — si no, "porc." podía matchear solo "p" y dejar
// "orc" suelto. El \b de cierre es una red de seguridad extra para lo mismo.
const QUANTITY_PREFIX =
  /^\d+\s*(porciones|porción|porc\.?|platos|plato|latas|lata|tazas|taza|p\.?)?\b\s*/i;

const NON_ITEMS = new Set(["libre", "descanso", "a gusto", "gusto", "etc", "etc."]);
const HAS_LETTER = /[a-zá-úñ]/i;

export function buildShoppingList(meals: Meal[]): string[] {
  const items = new Set<string>();
  for (const meal of meals) {
    if (!meal.food) continue;
    for (const raw of meal.food.split(SPLIT_REGEX)) {
      const cleaned = raw
        .replace(QUANTITY_PREFIX, "")
        .replace(/[()]/g, "")
        .trim();
      if (cleaned.length < 2 || !HAS_LETTER.test(cleaned)) continue;
      const lower = cleaned.toLowerCase();
      if (NON_ITEMS.has(lower)) continue;
      items.add(cleaned[0].toUpperCase() + cleaned.slice(1));
    }
  }
  return [...items].sort((a, b) => a.localeCompare(b, "es"));
}

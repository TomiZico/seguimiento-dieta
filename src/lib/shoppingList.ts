import type { Meal } from "./types";

// Separa la descripción libre de una comida ("2 porc. Carne con ensalada +
// arroz. Fruta o pollo") en ítems sueltos, incluyendo "con" y "o" como
// separadores: así "carne con ensalada" da dos ítems en vez de una frase
// larga que después no matchea con "carne" de otra comida. Es heurístico
// (aproximado), no un parser de recetas — la lista es un punto de partida.
const SPLIT_REGEX = /,|\+|\.(?!\d)|\by\b|\bo\b|\bcon\b/gi;

// El orden importa: la alternancia de regex prueba las opciones en orden y
// se queda con la primera que matchea (no la más larga), así que las formas
// más largas van primero — si no, "porc." podía matchear solo "p" y dejar
// "orc" suelto. El \b de cierre es una red de seguridad extra para lo mismo.
const QUANTITY_PREFIX =
  /^\d+\s*(porciones|porción|porc\.?|platos|plato|latas|lata|tazas|taza|p\.?)?\b\s*/i;

const LEADING_FILLER = /^(de|del|la|el|los|las|un|una)\s+/i;

const NON_ITEMS = new Set([
  "libre",
  "descanso",
  "a gusto",
  "gusto",
  "etc",
  "etc.",
  "de",
  "gramos",
]);
const HAS_LETTER = /[a-zá-úñ]/i;

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Clave de deduplicación: minúsculas, sin acentos y singularizado a lo
 * bruto, para que "Frutas"/"fruta" o "Cereales"/"cereal" no queden como
 * ítems repetidos en la lista. */
function dedupeKey(item: string): string {
  const base = stripAccents(item.toLowerCase()).trim();
  if (base.endsWith("es") && base.length > 4) return base.slice(0, -2);
  if (base.endsWith("s") && base.length > 3) return base.slice(0, -1);
  return base;
}

export function buildShoppingList(meals: Meal[]): string[] {
  const byKey = new Map<string, string>();
  for (const meal of meals) {
    if (!meal.food) continue;
    for (const raw of meal.food.split(SPLIT_REGEX)) {
      const cleaned = raw
        .trim()
        .replace(QUANTITY_PREFIX, "")
        .replace(/[()]/g, "")
        .replace(LEADING_FILLER, "")
        .trim();
      if (cleaned.length < 2 || !HAS_LETTER.test(cleaned)) continue;
      const lower = cleaned.toLowerCase();
      if (NON_ITEMS.has(lower)) continue;

      const key = dedupeKey(cleaned);
      if (!byKey.has(key)) {
        byKey.set(key, cleaned[0].toUpperCase() + cleaned.slice(1));
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "es"));
}

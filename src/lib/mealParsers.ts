import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { normalize } from "./text";
import { matchMealType } from "./mealType";
import { parseTime, resolveDayToDates } from "./dateResolve";
import type { DraftMeal, MealType } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_TIMES: Record<MealType, string> = {
  desayuno: "08:00",
  media_manana: "10:30",
  almuerzo: "13:00",
  media_tarde: "17:00",
  merienda: "17:30",
  cena: "21:00",
};

export interface ParseResult {
  meals: DraftMeal[];
  warnings: string[];
}

function findColumn(headers: string[], candidates: string[]): number {
  const normed = headers.map(normalize);
  for (const cand of candidates) {
    const idx = normed.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Interpreta filas [Día, Comida, Alimento, Horario] (orden de columnas flexible). */
function rowsToMeals(rows: string[][], targetMonth: Date): ParseResult {
  const warnings: string[] = [];
  const meals: DraftMeal[] = [];
  if (rows.length === 0) return { meals, warnings: ["El archivo está vacío."] };

  const header = rows[0] ?? [];
  const diaIdx = findColumn(header, ["dia", "fecha"]);
  const comidaIdx = findColumn(header, ["comida", "tipo"]);
  const alimentoIdx = findColumn(header, ["aliment", "plato", "detalle", "menu", "descripcion"]);
  const horarioIdx = findColumn(header, ["horario", "hora"]);

  if (diaIdx === -1 || comidaIdx === -1 || alimentoIdx === -1) {
    return {
      meals,
      warnings: [
        'No encontré las columnas "Día", "Comida" y "Alimento" en la primera fila. Revisá el archivo o cargá las comidas manualmente en la vista previa.',
      ],
    };
  }
  if (horarioIdx === -1) {
    warnings.push(
      'No encontré la columna "Horario": usé un horario habitual por tipo de comida. Revisalo antes de confirmar.',
    );
  }

  const colacionOccurrence = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !String(c ?? "").trim())) continue;

    const dayRaw = String(row[diaIdx] ?? "").trim();
    const comidaRaw = String(row[comidaIdx] ?? "").trim();
    const alimentoRaw = String(row[alimentoIdx] ?? "").trim();
    const horarioRaw = horarioIdx !== -1 ? String(row[horarioIdx] ?? "").trim() : "";

    if (!dayRaw && !comidaRaw && !alimentoRaw) continue;

    const dayKey = normalize(dayRaw);
    const isColacionSinCalificar =
      /colacion|snack/.test(normalize(comidaRaw)) &&
      !/manana|tarde|am|pm|1|2/.test(normalize(comidaRaw));
    const parsedTime = horarioRaw ? parseTime(horarioRaw) : null;

    let mealType: DraftMeal["meal_type"] | null;
    if (isColacionSinCalificar && parsedTime) {
      // Con horario disponible, lo usamos para desambiguar en vez de adivinar por orden de aparición.
      mealType = Number(parsedTime.slice(0, 2)) < 12 ? "media_manana" : "media_tarde";
    } else {
      const occurrence = colacionOccurrence.get(dayKey) ?? 0;
      mealType = matchMealType(comidaRaw, occurrence);
      if (isColacionSinCalificar) colacionOccurrence.set(dayKey, occurrence + 1);
    }

    if (!mealType) {
      warnings.push(`Fila ${i + 1}: no reconocí el tipo de comida "${comidaRaw}", la salteé.`);
      continue;
    }

    const dates = resolveDayToDates(dayRaw, targetMonth);
    if (dates.length === 0) {
      warnings.push(`Fila ${i + 1}: no reconocí el día "${dayRaw}", la salteé.`);
      continue;
    }

    const time = parsedTime || DEFAULT_TIMES[mealType];

    for (const date of dates) {
      meals.push({ date, meal_type: mealType, food: alimentoRaw || "(sin detalle)", time });
    }
  }

  return { meals, warnings };
}

async function parseCsvFile(file: File): Promise<string[][]> {
  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return result.data;
}

async function parseExcelFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
}

/** Extrae texto del PDF agrupando por línea (coordenada Y) y separando "columnas" por espacios largos. */
async function parsePdfFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows: string[][] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const bucket = [...lines.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!lines.has(bucket)) lines.set(bucket, []);
      lines.get(bucket)!.push({ x, str: item.str });
    }

    const orderedY = [...lines.keys()].sort((a, b) => b - a);
    for (const y of orderedY) {
      const parts = (lines.get(y) ?? []).sort((a, b) => a.x - b.x).map((p) => p.str);
      const line = parts.join(" ");
      const cells = line
        .split(/\s{2,}|\t|\|/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) rows.push(cells);
    }
  }

  return rows;
}

export async function parseDietFile(file: File, targetMonth: Date): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv")) {
      return rowsToMeals(await parseCsvFile(file), targetMonth);
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      return rowsToMeals(await parseExcelFile(file), targetMonth);
    }
    if (name.endsWith(".pdf")) {
      const rows = await parsePdfFile(file);
      const result = rowsToMeals(rows, targetMonth);
      result.warnings.unshift(
        "Los PDF son más difíciles de interpretar automáticamente: revisá con atención el calendario antes de confirmar.",
      );
      return result;
    }
    return { meals: [], warnings: ["Formato no soportado. Subí un archivo .csv, .xlsx o .pdf."] };
  } catch (err) {
    return {
      meals: [],
      warnings: [`No pude leer el archivo: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

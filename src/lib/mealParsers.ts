import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import JSZip from "jszip";
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

const NON_MEAL_LABELS = [
  "observacion",
  "observaciones",
  "colaciones",
  "nota",
  "notas",
  "tip",
  "tips",
];

/**
 * Interpreta un plan semanal en texto libre, el formato más común en
 * planes de nutricionistas: un encabezado de día ("LUNES:") seguido de
 * líneas "Comida: descripción" (una colación entre desayuno y almuerzo, y
 * otra entre merienda y cena es habitual). No tiene columnas ni horarios
 * explícitos — se usa un horario habitual por tipo de comida. El plan se
 * repite en todas las fechas de ese día de la semana dentro del mes.
 */
export function parseFreeTextPlan(text: string, targetMonth: Date): ParseResult {
  const warnings: string[] = [];
  const meals: DraftMeal[] = [];
  const lines = text.split(/\r?\n/);

  let currentDates: string[] | null = null;
  let colacionOccurrence = 0;
  let currentMealType: MealType | null = null;
  let currentFoodParts: string[] = [];

  const flush = () => {
    if (currentDates && currentMealType && currentFoodParts.length > 0) {
      const food = currentFoodParts.join(" ").replace(/\s+/g, " ").trim();
      const time = DEFAULT_TIMES[currentMealType];
      for (const date of currentDates) {
        meals.push({ date, meal_type: currentMealType, food: food || "(sin detalle)", time });
      }
    }
    currentMealType = null;
    currentFoodParts = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const beforeColon = line.split(":")[0]?.trim() ?? "";
    const dayCandidateDates = beforeColon ? resolveDayToDates(beforeColon, targetMonth) : [];

    if (dayCandidateDates.length > 0) {
      flush();
      currentDates = dayCandidateDates;
      colacionOccurrence = 0;
      continue;
    }

    if (!currentDates) continue; // texto antes del primer día (título, etc.): se ignora

    const match = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*?)\s*_?\s*:\s*(.*)$/);
    if (match?.[1]) {
      const label = match[1];
      const rest = match[2] ?? "";
      const normalizedLabel = normalize(label);

      if (NON_MEAL_LABELS.some((n) => normalizedLabel.includes(n))) {
        flush();
        continue;
      }

      const isColacionSinCalificar =
        /colacion|snack/.test(normalizedLabel) && !/manana|tarde|am|pm|1|2/.test(normalizedLabel);
      const mealType = matchMealType(label, colacionOccurrence);
      if (isColacionSinCalificar) colacionOccurrence++;

      if (mealType) {
        flush();
        currentMealType = mealType;
        currentFoodParts = rest ? [rest] : [];
        continue;
      }
    }

    // Línea de continuación (el texto de la comida sigue en la línea siguiente).
    if (currentMealType) currentFoodParts.push(line);
  }
  flush();

  if (meals.length === 0) {
    warnings.push(
      'No pude reconocer ningún día ni comida en el texto. Revisá que tenga un encabezado por día (por ejemplo "Lunes:") seguido de líneas "Desayuno: ...", "Almuerzo: ...", etc.',
    );
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

/**
 * Extrae texto del PDF agrupando por línea (coordenada Y). Devuelve tanto
 * las líneas planas (para el plan en texto libre, el caso más común) como
 * una versión partida por "columnas" separadas por espacios largos (por si
 * el PDF sí tiene una tabla real).
 */
async function parsePdfFile(file: File): Promise<{ rows: string[][]; lines: string[] }> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows: string[][] = [];
  const textLines: string[] = [];

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
      textLines.push(line);
      const cells = line
        .split(/\s{2,}|\t|\|/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) rows.push(cells);
    }
  }

  return { rows, lines: textLines };
}

/** Junta el texto de todos los <w:t> dentro de un elemento (una celda, un párrafo, etc). */
function textOf(el: Element): string {
  return [...el.getElementsByTagName("w:t")].map((t) => t.textContent ?? "").join("");
}

/**
 * Extrae la primera tabla de un .docx (Word) leyendo directamente
 * word/document.xml dentro del .zip. Si el documento no tiene una tabla
 * (el caso más común: un plan semanal en texto libre), devuelve el texto
 * de cada párrafo para que se interprete con parseFreeTextPlan.
 */
async function parseDocxFile(
  file: File,
): Promise<{ rows: string[][]; hadTable: boolean; text: string }> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const xmlText = await zip.file("word/document.xml")?.async("string");
  if (!xmlText) throw new Error("No parece un archivo .docx válido.");

  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("No pude interpretar el contenido del .docx.");
  }

  const paragraphs = [...doc.getElementsByTagName("w:p")].map((p) => textOf(p).trim());
  const table = doc.getElementsByTagName("w:tbl")[0];
  if (table) {
    const rows = [...table.getElementsByTagName("w:tr")].map((tr) =>
      [...tr.getElementsByTagName("w:tc")].map((tc) => textOf(tc).trim()),
    );
    return { rows, hadTable: true, text: paragraphs.join("\n") };
  }

  return { rows: [], hadTable: false, text: paragraphs.join("\n") };
}

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

async function looksLikeLegacyDoc(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return OLE_MAGIC.every((b, i) => head[i] === b);
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
      const { rows, lines } = await parsePdfFile(file);
      const tableResult = rowsToMeals(rows, targetMonth);
      if (tableResult.meals.length > 0) {
        tableResult.warnings.unshift(
          "Los PDF son más difíciles de interpretar automáticamente: revisá con atención el calendario antes de confirmar.",
        );
        return tableResult;
      }
      const freeTextResult = parseFreeTextPlan(lines.join("\n"), targetMonth);
      freeTextResult.warnings.unshift(
        "Interpreté el PDF como un plan semanal en texto libre (sin tabla): revisá con atención el calendario antes de confirmar.",
      );
      return freeTextResult;
    }
    if (name.endsWith(".docx")) {
      const { rows, hadTable, text } = await parseDocxFile(file);
      if (hadTable) {
        const result = rowsToMeals(rows, targetMonth);
        if (result.meals.length > 0) return result;
      }
      const result = parseFreeTextPlan(text, targetMonth);
      result.warnings.unshift(
        "No encontré una tabla en el documento: lo interpreté como un plan semanal en texto libre. Revisá con atención el calendario antes de confirmar.",
      );
      return result;
    }
    if (name.endsWith(".doc") || (await looksLikeLegacyDoc(file))) {
      return {
        meals: [],
        warnings: [
          'El formato .doc (Word 97-2003) no se puede leer directamente en el navegador. La forma más fácil: abrí el archivo, seleccioná todo el texto (Ctrl+A, Ctrl+C) y usá la opción "Pegar texto" de esta pantalla. También podés guardarlo como .docx o PDF desde Word y subirlo de nuevo.',
        ],
      };
    }
    return {
      meals: [],
      warnings: ["Formato no soportado. Subí un archivo .csv, .xlsx, .docx o .pdf."],
    };
  } catch (err) {
    return {
      meals: [],
      warnings: [`No pude leer el archivo: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

import { normalize } from "./text";

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Resuelve el valor de la columna "Día" (fecha explícita, día de la semana,
 * número de día del mes, o "todos los días") a una o más fechas ISO dentro
 * del mes objetivo.
 */
export function resolveDayToDates(raw: string, targetMonth: Date): string[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const n = normalize(raw);
  if (!n) return [];

  if (/todos|diario|cada dia/.test(n)) {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => toISO(year, month, i + 1));
  }

  if (WEEKDAYS[n] !== undefined) {
    const dow = WEEKDAYS[n];
    const total = daysInMonth(year, month);
    const dates: string[] = [];
    for (let d = 1; d <= total; d++) {
      if (new Date(year, month, d).getDay() === dow) dates.push(toISO(year, month, d));
    }
    return dates;
  }

  // dd/mm[/yyyy] o dd-mm[-yyyy]
  const explicit = n.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (explicit?.[1] && explicit[2]) {
    const day = Number(explicit[1]);
    const mo = Number(explicit[2]) - 1;
    const y = explicit[3]
      ? explicit[3].length === 2
        ? 2000 + Number(explicit[3])
        : Number(explicit[3])
      : year;
    if (day >= 1 && day <= 31 && mo >= 0 && mo <= 11) return [toISO(y, mo, day)];
  }

  // yyyy-mm-dd
  const iso = n.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso?.[1] && iso[2] && iso[3]) {
    return [toISO(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))];
  }

  // solo el número de día ("5", "05")
  const plain = n.match(/^(\d{1,2})$/);
  if (plain?.[1]) {
    const day = Number(plain[1]);
    if (day >= 1 && day <= daysInMonth(year, month)) return [toISO(year, month, day)];
  }

  return [];
}

export function parseTime(raw: string): string | null {
  const n = normalize(raw)
    .replace(/hs\.?|horas?/g, "")
    .trim();
  const m = n.match(/(\d{1,2})[:.h](\d{2})/) ?? n.match(/^(\d{1,2})$/);
  if (!m?.[1]) return null;
  const hh = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (hh > 23 || mm > 59) return null;
  return `${pad(hh)}:${pad(mm)}`;
}

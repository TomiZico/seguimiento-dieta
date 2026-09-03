export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso + "T00:00:00")
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    .replace(/\./g, "");
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function monthRange(d: Date): { start: string; end: string } {
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function weekRange(d: Date): { start: string; end: string } {
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toISO = (x: Date) => {
    const off = x.getTimezoneOffset();
    return new Date(x.getTime() - off * 60000).toISOString().slice(0, 10);
  };
  return { start: toISO(monday), end: toISO(sunday) };
}

/** Celdas del calendario mensual: null para relleno antes/después del mes. */
export function monthCalendarCells(d: Date): (string | null)[] {
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = domingo
  const leadingBlanks = firstDay === 0 ? 6 : firstDay - 1; // semana arranca lunes
  const lastDate = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= lastDate; day++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

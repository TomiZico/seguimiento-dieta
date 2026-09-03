const COMBINING_MARKS = /[̀-ͯ]/g;

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(COMBINING_MARKS, "");
}

export function normalize(s: string): string {
  return stripAccents(
    String(s ?? "")
      .trim()
      .toLowerCase(),
  ).replace(/\s+/g, " ");
}

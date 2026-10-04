// Input validation (Security Floor #4): length limits and type checks on every form.
// Nothing goes raw from a text box into the database.

export function text(
  v: FormDataEntryValue | null,
  min: number,
  max: number,
): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return s.length >= min && s.length <= max ? s : null;
}

export function oneOf<T extends string>(
  v: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export function isoDate(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime() <= Date.now() ? v : null;
}

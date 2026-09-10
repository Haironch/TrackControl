export const nowIso = () => new Date().toISOString();

export function toDayKey(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: string | Date | null | undefined, b: Date) {
  if (!a) return false;
  return toDayKey(a) === toDayKey(b);
}

export function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

export function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

export function daysBetween(a: string | Date, b: string | Date) {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return (db.getTime() - da.getTime()) / 86_400_000;
}

/** Semana ISO simplificada: lunes de la semana en formato YYYY-MM-DD. */
export function weekKey(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : new Date(iso);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  const monday = addDays(startOfDay(d), -day);
  return toDayKey(monday);
}

export function monthKey(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function inRange(iso: string | null | undefined, from?: Date | null, to?: Date | null) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

export function parseDateParam(value?: string | null, endOfDayFlag = false): Date | null {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return null;
  return endOfDayFlag && value.length === 10 ? endOfDay(d) : d;
}

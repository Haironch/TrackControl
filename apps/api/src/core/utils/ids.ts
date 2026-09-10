import { randomUUID } from 'node:crypto';

/** Genera ids legibles con prefijo (shp_ab12cd34). En PostgreSQL se puede usar uuid/cuid. */
export function newId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function padNumber(n: number, width = 5) {
  return String(n).padStart(width, '0');
}

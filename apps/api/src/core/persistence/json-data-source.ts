import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

export interface JsonCollectionStore<T> {
  name: string;
  items: T[];
  markDirty(): void;
}

interface JsonDataSourceOptions {
  seedDir: string;
  runtimeDir: string;
  persist: boolean;
  shiftDates: boolean;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Origen de datos JSON. Carga cada colección desde data/runtime (si existe) o data/seed,
 * y persiste los cambios de forma diferida (debounce) en data/runtime.
 *
 * Con SHIFT_MOCK_DATES=true, al cargar el seed desplaza todas las fechas para que la
 * fecha más reciente del seed coincida con "hoy" y el demo siempre muestre datos actuales.
 */
export class JsonDataSource {
  private readonly stores = new Map<string, JsonCollectionStore<unknown>>();
  private readonly dirty = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;
  private shiftMs = 0;

  constructor(private readonly options: JsonDataSourceOptions) {
    if (options.persist) fs.mkdirSync(options.runtimeDir, { recursive: true });
    this.computeShift();
  }

  private computeShift() {
    const metaPath = path.join(this.options.seedDir, 'meta.json');
    if (!this.options.shiftDates || !fs.existsSync(metaPath)) return;
    const runtimeMeta = path.join(this.options.runtimeDir, 'meta.json');
    // Si ya hay datos runtime, respetar su propia referencia temporal.
    const source = fs.existsSync(runtimeMeta) ? runtimeMeta : metaPath;
    const meta = JSON.parse(fs.readFileSync(source, 'utf8')) as { generatedAt: string };
    const generated = new Date(meta.generatedAt);
    const today = new Date();
    // Desplazar por días completos para conservar las horas del seed.
    const dayDiff = Math.floor((startOfDay(today).getTime() - startOfDay(generated).getTime()) / 86_400_000);
    this.shiftMs = dayDiff * 86_400_000;
    if (this.shiftMs !== 0) logger.info(`Seed generado el ${meta.generatedAt}; desplazando fechas ${dayDiff} día(s).`);
  }

  collection<T>(name: string): JsonCollectionStore<T> {
    const existing = this.stores.get(name);
    if (existing) return existing as JsonCollectionStore<T>;
    const items = this.load<T>(name);
    const store: JsonCollectionStore<T> = {
      name,
      items,
      markDirty: () => this.markDirty(name),
    };
    this.stores.set(name, store as JsonCollectionStore<unknown>);
    return store;
  }

  private load<T>(name: string): T[] {
    const runtimeFile = path.join(this.options.runtimeDir, `${name}.json`);
    const seedFile = path.join(this.options.seedDir, `${name}.json`);
    const file = this.options.persist && fs.existsSync(runtimeFile) ? runtimeFile : seedFile;
    if (!fs.existsSync(file)) {
      logger.warn(`Colección "${name}" no tiene archivo seed; se inicia vacía.`);
      return [];
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as T[];
    return this.shiftMs !== 0 ? (shiftDates(raw, this.shiftMs) as T[]) : raw;
  }

  private markDirty(name: string) {
    if (!this.options.persist) return;
    this.dirty.add(name);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 300);
  }

  flush() {
    if (!this.options.persist) return;
    for (const name of this.dirty) {
      const store = this.stores.get(name);
      if (!store) continue;
      const file = path.join(this.options.runtimeDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(store.items, null, 2), 'utf8');
    }
    if (this.dirty.size > 0) {
      // Registrar la referencia temporal del runtime para no volver a desplazar fechas.
      fs.writeFileSync(
        path.join(this.options.runtimeDir, 'meta.json'),
        JSON.stringify({ generatedAt: new Date().toISOString() }, null, 2),
      );
    }
    this.dirty.clear();
  }
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function shiftDates(value: unknown, ms: number): unknown {
  if (typeof value === 'string') {
    if (ISO_DATE_RE.test(value)) return new Date(new Date(value).getTime() + ms).toISOString();
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, ms));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = shiftDates(v, ms);
    return out;
  }
  return value;
}

import 'dotenv/config';
import path from 'node:path';

/**
 * Raíz del paquete apps/api. Se usa `process.cwd()` (no `import.meta.url`) porque
 * en producción el código se empaqueta con esbuild en un único `dist/main.js`,
 * lo que cambia la profundidad relativa del archivo y rompería un cálculo basado
 * en la ubicación del módulo. `process.cwd()` es estable en dev (`tsx src/main.ts`)
 * y en producción (`node dist/main.js`) siempre que el proceso se lance con el
 * directorio de trabajo en `apps/api` — que es lo que hace `npm run <script> -w
 * @trackcontrol/api` (npm workspaces fija el cwd al del workspace). Se permite
 * sobreescribirlo con API_ROOT_DIR para casos donde el cwd sea distinto.
 */
export const API_ROOT = process.env.API_ROOT_DIR ? path.resolve(process.env.API_ROOT_DIR) : process.cwd();

function bool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Normaliza un origen de CORS: si viene sin esquema (por ejemplo, un hostname
 * puro entregado por `fromService` en un Blueprint de Render), se le antepone
 * https://. Permite enlazar dos servicios de Render sin armar la URL a mano.
 */
function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
    .join(','),
  dataSource: (process.env.DATA_SOURCE ?? 'json') as 'json' | 'postgres',
  persistJson: bool(process.env.PERSIST_JSON, true),
  shiftMockDates: bool(process.env.SHIFT_MOCK_DATES, true),
  seedDir: path.join(API_ROOT, 'data', 'seed'),
  runtimeDir: path.join(API_ROOT, 'data', 'runtime'),
  databaseUrl: process.env.DATABASE_URL ?? null,
  isProduction: process.env.NODE_ENV === 'production',
};

import type { ApiErrorBody, PaginationMeta } from '@trackcontrol/shared';

/**
 * Resuelve la URL base del API a partir de VITE_API_URL.
 * Acepta tres formas:
 *  - vacío/no definido → '/api' (mismo origen, útil en dev con el proxy de Vite)
 *  - una ruta ('/api') o URL completa ('https://api.midominio.com/api') → se usa tal cual
 *  - solo un host ('mi-api.onrender.com', sin esquema) → se le antepone https:// y /api
 *    Esto permite enlazar dos servicios de Render entre sí mediante `fromService`
 *    (que solo expone el hostname) sin tener que armar la URL a mano.
 */
function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) return '/api';
  if (raw.startsWith('/') || raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}/api`;
}

const BASE_URL = resolveApiBaseUrl();
export const USER_STORAGE_KEY = 'trackcontrol.userId';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
}

export function getStoredUserId() {
  try {
    return localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserId(id: string | null) {
  try {
    if (id) localStorage.setItem(USER_STORAGE_KEY, id);
    else localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(method: string, path: string, options: { body?: unknown; query?: Query } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const userId = getStoredUserId();
  if (userId) headers['x-user-id'] = userId;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. ¿Está corriendo el API?');
  }

  const text = await response.text();
  const json = text ? (JSON.parse(text) as ApiResult<T> | ApiErrorBody) : ({} as ApiResult<T>);
  if (!response.ok) {
    const err = (json as ApiErrorBody).error;
    throw new ApiError(response.status, err?.code ?? 'UNKNOWN', err?.message ?? `Error ${response.status}`, err?.details);
  }
  return json as ApiResult<T>;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
      const first = error.details[0] as { path?: string; message?: string } | undefined;
      return first ? `${error.message} ${first.path ? `(${first.path}: ${first.message})` : ''}`.trim() : error.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

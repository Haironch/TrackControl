/**
 * Mapa de tokens de color → clases de Tailwind. Las clases deben estar escritas
 * completas para que Tailwind las incluya en el build.
 */
export interface ColorClasses {
  badge: string;
  dot: string;
  soft: string;
  text: string;
  hex: string;
}

export const COLOR_TOKENS: Record<string, ColorClasses> = {
  slate: { badge: 'bg-slate-100 text-slate-700 ring-slate-600/15', dot: 'bg-slate-500', soft: 'bg-slate-50', text: 'text-slate-600', hex: '#64748b' },
  zinc: { badge: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15', dot: 'bg-zinc-400', soft: 'bg-zinc-50', text: 'text-zinc-500', hex: '#a1a1aa' },
  stone: { badge: 'bg-stone-100 text-stone-700 ring-stone-600/15', dot: 'bg-stone-500', soft: 'bg-stone-50', text: 'text-stone-600', hex: '#78716c' },
  blue: { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500', soft: 'bg-blue-50', text: 'text-blue-600', hex: '#3b82f6' },
  indigo: { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-600', hex: '#6366f1' },
  sky: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-600', hex: '#0ea5e9' },
  cyan: { badge: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', dot: 'bg-cyan-500', soft: 'bg-cyan-50', text: 'text-cyan-600', hex: '#06b6d4' },
  emerald: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-600', hex: '#10b981' },
  amber: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-600', hex: '#f59e0b' },
  yellow: { badge: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20', dot: 'bg-yellow-500', soft: 'bg-yellow-50', text: 'text-yellow-700', hex: '#eab308' },
  orange: { badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-600', hex: '#f97316' },
  red: { badge: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500', soft: 'bg-red-50', text: 'text-red-600', hex: '#ef4444' },
  rose: { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-600', hex: '#f43f5e' },
  fuchsia: { badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20', dot: 'bg-fuchsia-500', soft: 'bg-fuchsia-50', text: 'text-fuchsia-600', hex: '#d946ef' },
  violet: { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-600', hex: '#8b5cf6' },
};

export const colorClasses = (token: string | undefined | null): ColorClasses => COLOR_TOKENS[token ?? 'slate'] ?? COLOR_TOKENS.slate;
export const colorHex = (token: string | undefined | null) => colorClasses(token).hex;

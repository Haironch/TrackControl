import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currency = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', notation: 'compact', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('es-GT');

export const formatCurrency = (n: number | null | undefined) => currency.format(n ?? 0).replace('GTQ', 'Q').replace(/\s/g, '');
export const formatCompactCurrency = (n: number | null | undefined) => compact.format(n ?? 0).replace('GTQ', 'Q').replace(/\s/g, '');
export const formatNumber = (n: number | null | undefined) => number.format(n ?? 0);
export const formatPercent = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('es-GT', { maximumFractionDigits: 1 })}%`;

export function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | Date | null | undefined, pattern = 'dd/MM/yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern, { locale: es }) : '—';
}

export function formatDateTime(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy HH:mm", { locale: es }) : '—';
}

export function formatTime(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, 'HH:mm', { locale: es }) : '—';
}

export function formatDayLabel(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return '—';
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export function formatRelative(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return '—';
  return `hace ${formatDistanceToNowStrict(d, { locale: es })}`;
}

export function toDateInputValue(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

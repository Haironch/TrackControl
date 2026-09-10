import { AlertTriangle, CircleDollarSign, FileEdit, MessageSquare, Wallet, type LucideIcon } from 'lucide-react';
import { FINANCIAL_STATUS_META, HistoryEntryType, type FinancialStatus, type ShipmentHistoryView } from '@trackcontrol/shared';
import { useStatuses } from '@/hooks/use-catalogs';
import { colorClasses } from '@/lib/colors';
import { cn, formatDayLabel, formatTime, toDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const TYPE_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  [HistoryEntryType.FINANCIAL]: { icon: CircleDollarSign, color: 'emerald', label: 'Financiero' },
  [HistoryEntryType.INCIDENT]: { icon: AlertTriangle, color: 'amber', label: 'Incidencia' },
  [HistoryEntryType.SETTLEMENT]: { icon: Wallet, color: 'violet', label: 'Liquidación' },
  [HistoryEntryType.NOTE]: { icon: MessageSquare, color: 'slate', label: 'Nota' },
  [HistoryEntryType.EDIT]: { icon: FileEdit, color: 'slate', label: 'Edición' },
};

export function Timeline({ entries }: { entries: ShipmentHistoryView[] }) {
  const { data: catalog = [] } = useStatuses();
  const statusOf = (code: string | null) => catalog.find((s) => s.code === code);
  const sorted = [...entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  // Agrupar por día
  const groups: { day: string; label: string; items: ShipmentHistoryView[] }[] = [];
  for (const e of sorted) {
    const d = toDate(e.occurredAt);
    const day = d ? d.toDateString() : '';
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, label: formatDayLabel(e.occurredAt), items: [e] });
  }

  if (!entries.length) return <p className="py-6 text-center text-sm text-slate-400">Sin movimientos registrados.</p>;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
          <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-6">
            {g.items.map((e) => {
              const isStatus = e.type === HistoryEntryType.STATUS;
              const def = isStatus ? statusOf(e.toStatus) : null;
              const meta = TYPE_META[e.type];
              const color = isStatus ? (def?.color ?? 'slate') : (meta?.color ?? 'slate');
              const c = colorClasses(color);
              const Icon = meta?.icon;
              return (
                <li key={e.id} className="relative">
                  <span className={cn('absolute -left-[31px] top-0.5 flex size-5 items-center justify-center rounded-full ring-4 ring-white', c.badge)}>
                    {Icon ? <Icon className="size-3" /> : <span className={cn('size-2 rounded-full', c.dot)} />}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="w-12 shrink-0 text-xs font-semibold text-slate-500 tabular">{formatTime(e.occurredAt)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isStatus ? (
                          <>
                            {e.fromStatus ? (
                              <>
                                <span className="text-xs text-slate-400">{statusOf(e.fromStatus)?.label ?? e.fromStatus}</span>
                                <span className="text-xs text-slate-300">→</span>
                              </>
                            ) : null}
                            <Badge color={color} dot className="uppercase tracking-wide">
                              {def?.label ?? e.toStatus}
                            </Badge>
                          </>
                        ) : e.type === HistoryEntryType.FINANCIAL ? (
                          <>
                            <span className="text-xs font-medium text-slate-500">{meta.label}</span>
                            {e.fromStatus ? <span className="text-xs text-slate-400">{FINANCIAL_STATUS_META[e.fromStatus as FinancialStatus]?.label ?? e.fromStatus} →</span> : null}
                            <Badge color={FINANCIAL_STATUS_META[e.toStatus as FinancialStatus]?.color ?? 'emerald'} className="uppercase tracking-wide">
                              {FINANCIAL_STATUS_META[e.toStatus as FinancialStatus]?.label ?? e.toStatus}
                            </Badge>
                          </>
                        ) : (
                          <span className={cn('text-xs font-semibold', c.text)}>{meta?.label ?? e.type}</span>
                        )}
                      </div>
                      {e.comment ? <p className="mt-1 text-sm text-slate-700">{e.comment}</p> : null}
                      <p className="mt-0.5 text-xs text-slate-400">{e.user ? e.user.name : 'Sistema'}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

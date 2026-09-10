import { FINANCIAL_STATUS_META, PAYMENT_TYPE_LABELS, type FinancialStatus, type PaymentType, type ShipmentStatusDefinition } from '@trackcontrol/shared';
import { Badge } from '@/components/ui/badge';
import { useStatuses } from '@/hooks/use-catalogs';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, definition, size = 'md' }: { status: string; definition?: ShipmentStatusDefinition; size?: 'sm' | 'md' }) {
  const { data: catalog } = useStatuses();
  const def = definition ?? catalog?.find((s) => s.code === status);
  return (
    <Badge color={def?.color ?? 'slate'} dot size={size} className="uppercase tracking-wide">
      {def?.label ?? status}
    </Badge>
  );
}

export function FinancialBadge({ status, size = 'md' }: { status: FinancialStatus; size?: 'sm' | 'md' }) {
  const meta = FINANCIAL_STATUS_META[status];
  return (
    <Badge color={meta?.color ?? 'slate'} size={size} className="uppercase tracking-wide">
      {meta?.label ?? status}
    </Badge>
  );
}

export function PaymentTypeBadge({ type }: { type: PaymentType }) {
  return (
    <Badge color={type === 'CONTRA_ENTREGA' ? 'amber' : 'zinc'} size="sm">
      {PAYMENT_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

export function CarrierChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-slate-700', className)}>
      <span className="size-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
}

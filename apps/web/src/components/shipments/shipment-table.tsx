import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { PaginationMeta, ShipmentQuery, ShipmentView } from '@trackcontrol/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { cn, formatCurrency, formatDate, formatRelative } from '@/lib/utils';
import { CarrierChip, FinancialBadge, StatusBadge } from './badges';
import { ShipmentActions } from './shipment-actions';

interface Props {
  data?: ShipmentView[];
  meta?: PaginationMeta;
  loading: boolean;
  query: ShipmentQuery;
  onQueryChange: (patch: Partial<ShipmentQuery>) => void;
  compact?: boolean;
}

type SortKey = NonNullable<ShipmentQuery['sortBy']>;

export function ShipmentTable({ data, meta, loading, query, onQueryChange, compact }: Props) {
  const navigate = useNavigate();

  const SortHead = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => {
    const active = query.sortBy === field;
    const Icon = active ? (query.sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <TableHead className={className}>
        <button
          type="button"
          className={cn('inline-flex items-center gap-1 hover:text-slate-800', active && 'text-slate-900')}
          onClick={() => onQueryChange({ sortBy: field, sortDir: active && query.sortDir === 'desc' ? 'asc' : 'desc', page: 1 })}
        >
          {label}
          <Icon className="size-3" />
        </button>
      </TableHead>
    );
  };

  if (loading && !data) return <TableSkeleton rows={compact ? 5 : 10} cols={7} />;
  if (!data?.length) return <EmptyState title="No hay envíos que coincidan" description="Prueba con otros filtros o crea un nuevo envío." />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHead label="Tracking" field="trackingNumber" />
            <SortHead label="Cliente" field="customerName" />
            {!compact ? <TableHead>Teléfono</TableHead> : null}
            <TableHead>Paquetería</TableHead>
            <TableHead>Destino</TableHead>
            <SortHead label="Monto" field="amountToCollect" className="text-right" />
            <SortHead label="Fecha" field="createdAt" />
            <SortHead label="Estado" field="status" />
            <TableHead>Financiero</TableHead>
            {!compact ? <SortHead label="Actualizado" field="updatedAt" /> : null}
            <TableHead className="w-12 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(loading && 'opacity-60')}>
          {data.map((s) => (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/paquetes/${s.id}`)}>
              <TableCell>
                <p className="whitespace-nowrap font-semibold text-slate-900">{s.trackingNumber}</p>
                {s.carrierGuideNumber ? <p className="text-[11px] text-slate-400">Guía {s.carrierGuideNumber}</p> : null}
              </TableCell>
              <TableCell>
                <p className="max-w-[180px] truncate font-medium text-slate-800">{s.customerName}</p>
                {compact ? <p className="text-[11px] text-slate-400">{s.customerPhone}</p> : null}
              </TableCell>
              {!compact ? <TableCell className="whitespace-nowrap text-slate-500 tabular">{s.customerPhone}</TableCell> : null}
              <TableCell>
                <CarrierChip name={s.carrier.name} color={s.carrier.color} />
              </TableCell>
              <TableCell>
                <p className="max-w-[160px] truncate text-slate-700">{s.municipality}</p>
                <p className="text-[11px] text-slate-400">{s.department}</p>
              </TableCell>
              <TableCell className="text-right">
                <p className="font-semibold text-slate-900 tabular">{s.amountToCollect > 0 ? formatCurrency(s.amountToCollect) : '—'}</p>
                <p className="text-[11px] text-slate-400">{s.paymentType === 'CONTRA_ENTREGA' ? 'Contra entrega' : s.paymentType === 'PREPAGADO' ? 'Prepagado' : 'Transferencia'}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-600 tabular">{formatDate(s.createdAt)}</TableCell>
              <TableCell>
                <StatusBadge status={s.status} definition={s.statusDefinition} />
              </TableCell>
              <TableCell>
                <FinancialBadge status={s.financialStatus} />
              </TableCell>
              {!compact ? <TableCell className="text-xs text-slate-500">{formatRelative(s.updatedAt)}</TableCell> : null}
              <TableCell className="text-right">
                <ShipmentActions shipment={s} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={(page) => onQueryChange({ page })} onPageSizeChange={compact ? undefined : (pageSize) => onQueryChange({ pageSize, page: 1 })} /> : null}
    </>
  );
}

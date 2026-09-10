import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { SETTLEMENT_STATUS_META, type SettlementStatus } from '@trackcontrol/shared';
import { useSettlementSummary, useSettlements } from '@/hooks/use-operations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CarrierChip } from '@/components/shipments/badges';
import { CreateSettlementDialog, SettlementDetailDialog } from '@/components/settlements/settlement-dialogs';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useCarriers } from '@/hooks/use-catalogs';

export function SettlementsPage() {
  const { can } = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [createCarrier, setCreateCarrier] = useState<string | undefined>();
  const [carrierId, setCarrierId] = useState('');
  const [status, setStatus] = useState<SettlementStatus | ''>('');
  const settlements = useSettlements({ carrierId: carrierId || undefined, status: status || undefined });
  const summary = useSettlementSummary();
  const { data: carriers = [] } = useCarriers();
  const openId = params.get('open');
  const canWrite = can('settlements:write');

  const totals = summary.data?.reduce((a, c) => ({ collected: a.collected + c.collected, settled: a.settled + c.settled, pending: a.pending + c.pending }), { collected: 0, settled: 0, pending: 0 });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Liquidaciones"
        description="Depósitos y pagos realizados por las paqueterías. Cada liquidación cambia el estado financiero de los envíos incluidos."
        actions={
          canWrite ? (
            <Button onClick={() => { setCreateCarrier(undefined); setCreateOpen(true); }}>
              <Plus /> Registrar liquidación
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Dinero pendiente por paquetería</CardTitle>
            <CardDescription>Cobrado a clientes en entregas vs. lo que cada paquetería ya liquidó.</CardDescription>
          </div>
          {totals ? (
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total pendiente</p>
              <p className="text-xl font-bold text-amber-600 tabular">{formatCurrency(totals.pending)}</p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {summary.data ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {summary.data.map((c) => {
                const pct = c.collected ? Math.round((c.settled / c.collected) * 100) : 0;
                return (
                  <div key={c.carrier.id} className="rounded-lg border border-slate-200 p-4">
                    <CarrierChip name={c.carrier.name} color={c.carrier.color} className="font-semibold" />
                    <p className="mt-1 text-xs text-slate-500">{c.delivered} entregados</p>
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cobrado</span>
                        <span className="tabular">{formatCurrency(c.collected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Liquidado</span>
                        <span className="text-emerald-700 tabular">{formatCurrency(c.settled)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-700">Pendiente</span>
                        <span className={cn('tabular', c.pending > 0 ? 'text-amber-600' : 'text-slate-700')}>{formatCurrency(c.pending)}</span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.carrier.color }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{pct}% liquidado</p>
                    {canWrite && c.pending > 0 ? (
                      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => { setCreateCarrier(c.carrier.id); setCreateOpen(true); }}>
                        Liquidar
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <Select className="w-auto min-w-[180px]" value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
            <option value="">Todas las paqueterías</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select className="w-auto min-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value as SettlementStatus | '')}>
            <option value="">Todos los estados</option>
            {Object.entries(SETTLEMENT_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        {settlements.isLoading ? (
          <TableSkeleton />
        ) : !settlements.data?.length ? (
          <EmptyState icon={Wallet} title="No hay liquidaciones registradas" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Liquidación</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Paquetes</TableHead>
                <TableHead className="text-right">Cobrado</TableHead>
                <TableHead className="text-right">Liquidado</TableHead>
                <TableHead className="text-right">Ajuste</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.data.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setParams({ open: s.id })}>
                  <TableCell className="font-semibold text-slate-900">{s.number}</TableCell>
                  <TableCell>
                    <CarrierChip name={s.carrier.name} color={s.carrier.color} />
                  </TableCell>
                  <TableCell className="tabular text-slate-600">{formatDate(s.date)}</TableCell>
                  <TableCell className="text-right tabular">{s.shipmentsCount}</TableCell>
                  <TableCell className="text-right tabular">{formatCurrency(s.totalCollected)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatCurrency(s.totalAmount)}</TableCell>
                  <TableCell className={cn('text-right tabular', s.adjustment !== 0 ? 'font-semibold text-rose-600' : 'text-slate-400')}>{s.adjustment !== 0 ? formatCurrency(s.adjustment) : '—'}</TableCell>
                  <TableCell className="text-slate-500">{s.reference ?? '—'}</TableCell>
                  <TableCell>
                    <Badge color={SETTLEMENT_STATUS_META[s.status].color} dot>
                      {SETTLEMENT_STATUS_META[s.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateSettlementDialog open={createOpen} onOpenChange={setCreateOpen} defaultCarrierId={createCarrier} />
      <SettlementDetailDialog id={openId} onClose={() => setParams({})} />
    </div>
  );
}

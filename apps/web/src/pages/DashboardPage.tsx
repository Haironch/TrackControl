import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  HandCoins,
  Package,
  PackageCheck,
  PackageX,
  RotateCcw,
  Send,
  Truck,
  Undo2,
  Wallet,
} from 'lucide-react';
import { HistoryEntryType } from '@trackcontrol/shared';
import { useDashboardActivity, useDashboardStatistics, useDashboardSummary } from '@/hooks/use-dashboard';
import { useStatuses } from '@/hooks/use-catalogs';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CarrierChart, DailyChart, DeliveriesVsReturnsChart, SalesChart, StatusChart, SuccessRateChart } from '@/components/dashboard/charts';
import { formatCurrency, formatNumber, formatPercent, formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState<'14' | '30' | '60'>('30');
  const summary = useDashboardSummary();
  const stats = useDashboardStatistics(Number(days));
  const activity = useDashboardActivity(8);
  const { data: catalog = [] } = useStatuses();
  const s = summary.data;
  const go = (q: string) => () => navigate(`/paquetes?${q}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="¿Dónde está mi paquete y dónde está mi dinero? Vista general de la operación y la conciliación."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/liquidaciones')}>
              <Wallet /> Liquidaciones
            </Button>
            <Button onClick={() => navigate('/paquetes/nuevo')}>
              <Package /> Crear envío
            </Button>
          </>
        }
      />

      {/* Operación */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Operación</h2>
        {s ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard compact label="Total paquetes" value={formatNumber(s.counts.total)} icon={Package} color="slate" onClick={go('')} />
            <StatCard compact label="Enviados hoy" value={formatNumber(s.counts.sentToday)} icon={Send} color="sky" hint={`${s.today.shipped} salieron a paquetería`} />
            <StatCard compact label="En tránsito" value={formatNumber(s.counts.inTransit)} icon={Truck} color="cyan" onClick={go('category=IN_TRANSIT')} />
            <StatCard compact label="Entregados" value={formatNumber(s.counts.delivered)} icon={PackageCheck} color="emerald" onClick={go('status=ENTREGADO')} hint={`${s.today.delivered} hoy`} />
            <StatCard compact label="Pendientes de entrega" value={formatNumber(s.counts.pendingDelivery)} icon={Clock} color="indigo" hint="Aún no cerrados" />
            <StatCard compact label="Rechazados" value={formatNumber(s.counts.rejected)} icon={PackageX} color="red" onClick={go('status=RECHAZADO')} />
            <StatCard compact label="En retorno" value={formatNumber(s.counts.returning)} icon={Undo2} color="rose" onClick={go('category=RETURNING')} />
            <StatCard compact label="Devueltos" value={formatNumber(s.counts.returned)} icon={RotateCcw} color="fuchsia" onClick={go('status=RECIBIDO_EN_BODEGA')} />
            <StatCard compact label="Con incidencias" value={formatNumber(s.counts.withIncidents)} icon={AlertTriangle} color="yellow" onClick={go('category=INCIDENT')} />
            <StatCard compact label="Pend. de liquidación" value={formatNumber(s.counts.pendingSettlement)} icon={HandCoins} color="amber" onClick={go('financialStatus=POR_LIQUIDAR')} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
      </section>

      {/* Finanzas */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Control financiero</h2>
        {s ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="overflow-hidden bg-slate-900 text-white lg:col-span-1">
              <CardContent className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dinero pendiente de recibir</p>
                <p className="mt-2 text-3xl font-bold tracking-tight tabular">{formatCurrency(s.financial.pendingToReceive)}</p>
                <p className="mt-1 text-xs text-slate-400">{s.counts.pendingSettlement} paquetes entregados que las paqueterías aún no han liquidado.</p>
                <div className="mt-4 space-y-2">
                  {s.byCarrier
                    .filter((c) => c.pendingAmount > 0)
                    .map((c) => (
                      <div key={c.carrier.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-300">
                          <span className="size-2 rounded-full" style={{ backgroundColor: c.carrier.color }} />
                          {c.carrier.name}
                        </span>
                        <span className="font-semibold tabular">{formatCurrency(c.pendingAmount)}</span>
                      </div>
                    ))}
                </div>
                <Link to="/liquidaciones" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200">
                  Registrar liquidación <ArrowRight className="size-3" />
                </Link>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-3">
              <StatCard compact label="Total vendido" value={formatCurrency(s.financial.totalSold)} icon={Banknote} color="slate" hint="Valor de productos enviados" />
              <StatCard compact label="Total entregado" value={formatCurrency(s.financial.totalDelivered)} icon={CheckCircle2} color="emerald" hint="Monto cobrado a clientes" />
              <StatCard compact label="Pendiente de cobrar" value={formatCurrency(s.financial.totalPendingCollection)} icon={Clock} color="indigo" hint="Paquetes aún no entregados" />
              <StatCard compact label="Liquidado por paqueterías" value={formatCurrency(s.financial.totalSettled)} icon={Wallet} color="emerald" hint="Dinero ya recibido" />
              <StatCard compact label="Costos de envío" value={formatCurrency(s.financial.shippingCosts)} icon={Truck} color="sky" hint="Acumulado de todos los envíos" />
              <StatCard compact label="Valor devuelto" value={formatCurrency(s.financial.returnedValue)} icon={RotateCcw} color="rose" hint={s.financial.inDispute > 0 ? `${formatCurrency(s.financial.inDispute)} en disputa` : 'Paquetes en retorno o devueltos'} />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <CardSkeleton className="h-56" />
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Gráficas */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Envíos y entregas por día</CardTitle>
              <CardDescription>Paquetes que salieron a paquetería vs. entregados al cliente.</CardDescription>
            </div>
            <Tabs value={days} onChange={setDays} items={[{ value: '14', label: '14 días' }, { value: '30', label: '30 días' }, { value: '60', label: '60 días' }]} className="shrink-0" />
          </CardHeader>
          <CardContent>{stats.data ? <DailyChart data={stats.data.daily} /> : <Skeleton className="h-[260px]" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasa de entregas exitosas</CardTitle>
            <CardDescription>Entregados vs. devueltos sobre paquetes cerrados.</CardDescription>
          </CardHeader>
          <CardContent>{stats.data ? <SuccessRateChart data={stats.data.successRate} /> : <Skeleton className="h-[220px]" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Paquetes por estado</CardTitle>
            <CardDescription>Distribución actual de toda la operación.</CardDescription>
          </CardHeader>
          <CardContent>{stats.data ? <StatusChart data={stats.data.byStatus} /> : <Skeleton className="h-[260px]" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas por semana</CardTitle>
            <CardDescription>Vendido, entregado y liquidado (últimas 8 semanas).</CardDescription>
          </CardHeader>
          <CardContent>{stats.data ? <SalesChart data={stats.data.salesByWeek} /> : <Skeleton className="h-[240px]" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por paquetería</CardTitle>
            <CardDescription>Entregados, en tránsito y devueltos.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.data ? (
              <>
                <CarrierChart data={stats.data.carrierPerformance} />
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  {stats.data.carrierPerformance.map((c) => (
                    <div key={c.carrier.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate text-slate-600">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.carrier.color }} />
                        <span className="truncate">{c.carrier.name}</span>
                      </span>
                      <span className={cn('font-semibold tabular', c.deliveryRate >= 85 ? 'text-emerald-600' : c.deliveryRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                        {formatPercent(c.deliveryRate)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Skeleton className="h-[240px]" />
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Entregas vs. devoluciones</CardTitle>
            <CardDescription>Evolución diaria del período seleccionado.</CardDescription>
          </CardHeader>
          <CardContent>{stats.data ? <DeliveriesVsReturnsChart data={stats.data.daily} /> : <Skeleton className="h-[220px]" />}</CardContent>
        </Card>

        {/* Cierre del día + actividad */}
        <Card>
          <CardHeader>
            <CardTitle>Cierre del día</CardTitle>
            <CardDescription>Resumen de lo ocurrido hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Closing label="Salieron" value={s.today.shipped} color="sky" />
                  <Closing label="Entregados" value={s.today.delivered} color="emerald" />
                  <Closing label="Regresaron" value={s.today.returned} color="rose" />
                  <Closing label="Incidencias" value={s.today.incidents} color="yellow" />
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cobrado hoy</span>
                    <span className="font-semibold tabular">{formatCurrency(s.today.collectedToday)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-slate-500">Pendiente de liquidación</span>
                    <span className="font-semibold text-amber-600 tabular">{formatCurrency(s.today.pendingSettlementAmount)}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Hoy salieron <strong>{s.today.shipped}</strong> paquetes, se entregaron <strong>{s.today.delivered}</strong>, regresaron <strong>{s.today.returned}</strong> y quedan{' '}
                  <strong>{formatCurrency(s.today.pendingSettlementAmount)}</strong> pendientes de liquidación.
                </p>
              </div>
            ) : (
              <Skeleton className="h-40" />
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimos movimientos registrados en el sistema.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/paquetes?sortBy=updatedAt')}>
              Ver paquetes <ArrowRight />
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {activity.data
              ? activity.data.map((a) => {
                  const def = catalog.find((c) => c.code === a.toStatus);
                  return (
                    <Link key={a.id} to={a.shipment ? `/paquetes/${a.shipment.id}` : '#'} className="flex items-center gap-3 py-2.5 hover:bg-slate-50">
                      <span className="w-28 shrink-0 text-xs font-semibold text-slate-800">{a.shipment?.trackingNumber ?? '—'}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                        {a.type === HistoryEntryType.STATUS && def ? (
                          <Badge color={def.color} dot size="sm" className="mr-2 uppercase">
                            {def.label}
                          </Badge>
                        ) : null}
                        {a.comment ?? a.shipment?.customerName}
                      </span>
                      <span className="hidden text-xs text-slate-400 sm:block">{a.user?.name ?? 'Sistema'}</span>
                      <span className="w-24 shrink-0 text-right text-xs text-slate-400">{formatRelative(a.occurredAt)}</span>
                    </Link>
                  );
                })
              : Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-2 h-6" />)}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Closing({ label, value, color }: { label: string; value: number; color: string }) {
  const c = { sky: 'text-sky-600 bg-sky-50', emerald: 'text-emerald-600 bg-emerald-50', rose: 'text-rose-600 bg-rose-50', yellow: 'text-yellow-700 bg-yellow-50' }[color];
  return (
    <div className={cn('rounded-lg p-3', c)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular">{value}</p>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Building2, Camera, FileSignature, MapPin, MessageSquarePlus, Package, Phone, Wallet } from 'lucide-react';
import { INCIDENT_STATUS_META, INCIDENT_TYPE_LABELS, PAYMENT_TYPE_LABELS, SETTLEMENT_STATUS_META, type PaymentType } from '@trackcontrol/shared';
import { useAddNote, useShipment } from '@/hooks/use-shipments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { CarrierChip, FinancialBadge, PaymentTypeBadge, StatusBadge } from '@/components/shipments/badges';
import { ShipmentActions } from '@/components/shipments/shipment-actions';
import { Timeline } from '@/components/shipments/timeline';
import { errorMessage } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, formatRelative } from '@/lib/utils';

export function ShipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: s, isLoading, error } = useShipment(id);
  const addNote = useAddNote();
  const [note, setNote] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (error || !s) {
    return <EmptyState title="Envío no encontrado" description={error ? errorMessage(error) : undefined} action={<Button onClick={() => navigate('/paquetes')}>Volver a paquetes</Button>} />;
  }

  const submitNote = async () => {
    if (!note.trim()) return;
    try {
      await addNote.mutateAsync({ id: s.id, comment: note.trim() });
      setNote('');
      toast.success('Nota agregada');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/paquetes" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="size-3.5" /> Paquetes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{s.trackingNumber}</h1>
            <StatusBadge status={s.status} definition={s.statusDefinition} />
            <FinancialBadge status={s.financialStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Creado el {formatDateTime(s.createdAt)} · Última actualización {formatRelative(s.updatedAt)}
            {s.assignedUser ? ` · Responsable: ${s.assignedUser.name}` : ''}
          </p>
        </div>
        <ShipmentActions shipment={s} variant="buttons" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del envío</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Info label="Cliente" value={s.customerName} icon={Package} />
              <Info label="Teléfono" value={s.customerPhone} icon={Phone} />
              <Info label="Dirección" value={`${s.address}, ${s.municipality}, ${s.department}`} icon={MapPin} className="sm:col-span-2" />
              <Info label="Paquetería" value={<CarrierChip name={s.carrier.name} color={s.carrier.color} />} icon={Building2} />
              <Info label="Guía de la paquetería" value={s.carrierGuideNumber ?? 'Sin asignar'} />
              <Info label="Entregado a paquetería" value={formatDateTime(s.deliveredToCarrierAt)} />
              <Info label="Entrega estimada" value={formatDate(s.estimatedDeliveryAt)} />
              <Info label="Entrega real" value={formatDateTime(s.deliveredAt)} />
              <Info label="Recibido en bodega" value={formatDateTime(s.returnedAt)} />
              <Info label="Descripción" value={s.description} className="sm:col-span-2" />
              {s.notes ? <Info label="Observaciones" value={s.notes} className="sm:col-span-2" /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos ({s.itemsCount})</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="pb-2 text-left font-semibold">Producto</th>
                    <th className="pb-2 text-right font-semibold">Cant.</th>
                    <th className="pb-2 text-right font-semibold">Precio</th>
                    <th className="pb-2 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.products.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-slate-800">{p.name}</td>
                      <td className="py-2 text-right tabular">{p.quantity}</td>
                      <td className="py-2 text-right tabular">{formatCurrency(p.unitPrice)}</td>
                      <td className="py-2 text-right font-medium tabular">{formatCurrency(p.quantity * p.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Línea de tiempo</CardTitle>
                <CardDescription>Cada movimiento guarda fecha, estado anterior, estado nuevo, usuario y comentario.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex gap-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota al historial…" className="min-h-[44px]" rows={1} />
                <Button variant="secondary" onClick={submitNote} loading={addNote.isPending} disabled={!note.trim()}>
                  <MessageSquarePlus /> Nota
                </Button>
              </div>
              <Timeline entries={s.history} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="size-4 text-brand-300" /> Control financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Row label="Tipo de pago" value={<PaymentTypeBadge type={s.paymentType as PaymentType} />} />
              <Row label="Valor de productos" value={formatCurrency(s.productValue)} />
              <Row label="Costo de envío" value={formatCurrency(s.shippingCost)} />
              <div className="border-t border-slate-100 pt-3">
                <Row label="Monto a cobrar" value={<span className="text-lg font-bold">{formatCurrency(s.amountToCollect)}</span>} />
              </div>
              <Row label="Estado financiero" value={<FinancialBadge status={s.financialStatus} />} />
              <p className="text-xs text-slate-500">{PAYMENT_TYPE_LABELS[s.paymentType as PaymentType]} · {financialHint(s.financialStatus, s.carrier.name)}</p>
              {s.settlement ? (
                <Link to={`/liquidaciones?open=${s.settlement.id}`} className="block rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs hover:bg-emerald-100">
                  <p className="font-semibold text-emerald-800">Liquidación {s.settlement.number}</p>
                  <p className="text-emerald-700">
                    {formatDate(s.settlement.date)} · {formatCurrency(s.settlement.totalAmount)} ·{' '}
                    <Badge color={SETTLEMENT_STATUS_META[s.settlement.status].color} size="sm">
                      {SETTLEMENT_STATUS_META[s.settlement.status].label}
                    </Badge>
                  </p>
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Incidencias ({s.incidents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.incidents.length === 0 ? <p className="text-xs text-slate-400">Sin incidencias registradas.</p> : null}
              {s.incidents.map((i) => (
                <div key={i.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">{INCIDENT_TYPE_LABELS[i.type]}</span>
                    <Badge color={INCIDENT_STATUS_META[i.status].color} size="sm">
                      {INCIDENT_STATUS_META[i.status].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{i.description}</p>
                  {i.resolution ? <p className="mt-1 text-xs text-emerald-700">Resolución: {i.resolution}</p> : null}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDateTime(i.createdAt)} · {i.reportedBy?.name ?? 'Sistema'}
                  </p>
                </div>
              ))}
              <Link to="/incidencias" className="text-xs font-medium text-brand-700 hover:underline">
                Ver módulo de incidencias
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidencias</CardTitle>
              <CardDescription>Preparado para fotografías, firma y comprobantes.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Placeholder icon={Camera} label="Foto de entrega" />
              <Placeholder icon={FileSignature} label="Firma de recibido" />
              <Placeholder icon={Package} label="Comprobante de entrega" />
              <Placeholder icon={MapPin} label="Coordenadas GPS" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function financialHint(status: string, carrier: string) {
  switch (status) {
    case 'PENDIENTE':
      return 'El dinero se cobrará al entregar.';
    case 'POR_LIQUIDAR':
      return `${carrier} debe liquidar este monto.`;
    case 'LIQUIDADO':
      return 'Dinero recibido de la paquetería.';
    case 'AJUSTE':
      return 'Liquidado con diferencia respecto a lo cobrado.';
    case 'DISPUTA':
      return 'En reclamo con la paquetería.';
    default:
      return 'No hay cobro contra entrega.';
  }
}

function Info({ label, value, icon: Icon, className }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </p>
      <div className="mt-0.5 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 tabular">{value}</span>
    </div>
  );
}

function Placeholder({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 p-3 text-center text-slate-400">
      <Icon className="size-4" />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

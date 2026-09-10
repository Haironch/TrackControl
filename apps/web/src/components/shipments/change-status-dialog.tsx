import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import type { ShipmentView } from '@trackcontrol/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useStatuses } from '@/hooks/use-catalogs';
import { useChangeStatus } from '@/hooks/use-shipments';
import { useCurrentUser } from '@/hooks/use-current-user';
import { errorMessage, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from './badges';

interface Props {
  shipment: ShipmentView | null;
  /** Estado destino preseleccionado (acciones rápidas). */
  targetStatus?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangeStatusDialog({ shipment, targetStatus, open, onOpenChange, onSuccess }: Props) {
  const { data: catalog = [] } = useStatuses();
  const { user } = useCurrentUser();
  const mutation = useChangeStatus();
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [guide, setGuide] = useState('');
  const [force, setForce] = useState(false);

  const current = useMemo(() => catalog.find((s) => s.code === shipment?.status), [catalog, shipment]);
  const allowed = useMemo(() => {
    if (!current) return [];
    const codes = force ? catalog.map((s) => s.code) : current.nextStatuses;
    return catalog.filter((s) => codes.includes(s.code) && s.code !== current.code);
  }, [catalog, current, force]);

  useEffect(() => {
    if (open) {
      setStatus(targetStatus ?? '');
      setComment('');
      setGuide(shipment?.carrierGuideNumber ?? '');
      setForce(false);
    }
  }, [open, targetStatus, shipment]);

  const target = catalog.find((s) => s.code === status);
  const isCod = shipment?.paymentType === 'CONTRA_ENTREGA' && (shipment?.amountToCollect ?? 0) > 0;

  const submit = async () => {
    if (!shipment || !status) return;
    try {
      await mutation.mutateAsync({ id: shipment.id, status, comment: comment || null, carrierGuideNumber: guide || null, force: force || undefined });
      toast.success(`${shipment.trackingNumber} → ${target?.label ?? status}`, {
        description: status === 'ENTREGADO' && isCod ? `Se sumaron ${formatCurrency(shipment.amountToCollect)} a pendiente de liquidación.` : undefined,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(errorMessage(error), { description: error instanceof ApiError && error.code === 'FORBIDDEN' ? 'Cambia de usuario para probar otro rol.' : undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Cambiar estado del envío</DialogTitle>
          <DialogDescription>
            {shipment?.trackingNumber} · {shipment?.customerName}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            {shipment ? <StatusBadge status={shipment.status} definition={shipment.statusDefinition} /> : null}
            <ArrowRight className="size-4 text-slate-400" />
            {target ? <StatusBadge status={target.code} definition={target} /> : <span className="text-xs text-slate-400">Selecciona el nuevo estado</span>}
          </div>
          <Field label="Nuevo estado" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Selecciona…</option>
              {allowed.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label} — {s.description}
                </option>
              ))}
            </Select>
          </Field>
          {status === 'ENTREGADO_A_PAQUETERIA' || (!shipment?.carrierGuideNumber && status && status !== 'PREPARADO') ? (
            <Field label="Número de guía de la paquetería" hint="Opcional. Se guarda en el envío.">
              <Input value={guide} onChange={(e) => setGuide(e.target.value)} placeholder="Ej. CE-8841237" />
            </Field>
          ) : null}
          <Field label="Comentario" hint="Se registrará en la línea de tiempo del envío.">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej. Entregado a familiar del cliente" />
          </Field>
          {status === 'ENTREGADO' && isCod ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Este envío es contra entrega. Al marcarlo entregado, <strong>{formatCurrency(shipment?.amountToCollect)}</strong> pasarán a <strong>pendiente de liquidación</strong> por parte de {shipment?.carrier.name}.
            </p>
          ) : null}
          {user?.role === 'ADMINISTRADOR' ? (
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="accent-slate-900" />
              Permitir cualquier transición (solo administrador)
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={mutation.isPending} disabled={!status}>
            Confirmar cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

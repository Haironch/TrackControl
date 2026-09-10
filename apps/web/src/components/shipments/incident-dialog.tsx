import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { INCIDENT_TYPE_LABELS, IncidentType, type ShipmentView } from '@trackcontrol/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useCreateIncident } from '@/hooks/use-operations';
import { useUsers } from '@/hooks/use-catalogs';
import { useShipments } from '@/hooks/use-shipments';
import { errorMessage } from '@/lib/api';

interface Props {
  shipment?: ShipmentView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentDialog({ shipment, open, onOpenChange }: Props) {
  const mutation = useCreateIncident();
  const { data: users = [] } = useUsers();
  const [shipmentId, setShipmentId] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<IncidentType>(IncidentType.CLIENTE_NO_RESPONDE);
  const [description, setDescription] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [move, setMove] = useState(true);
  const lookup = useShipments({ search, pageSize: 8, sortBy: 'updatedAt', sortDir: 'desc' });

  useEffect(() => {
    if (open) {
      setShipmentId(shipment?.id ?? '');
      setSearch('');
      setType(IncidentType.CLIENTE_NO_RESPONDE);
      setDescription('');
      setAssignedUserId('');
      setMove(true);
    }
  }, [open, shipment]);

  const submit = async () => {
    if (!shipmentId || description.trim().length < 3) {
      toast.error('Selecciona el envío y describe la incidencia.');
      return;
    }
    try {
      await mutation.mutateAsync({ shipmentId, type, description: description.trim(), assignedUserId: assignedUserId || null, moveShipmentToIncident: move });
      toast.success('Incidencia registrada', { description: move ? 'El envío pasó al estado Incidencia.' : undefined });
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Registrar incidencia</DialogTitle>
          <DialogDescription>{shipment ? `${shipment.trackingNumber} · ${shipment.customerName}` : 'Busca el envío afectado y describe el problema.'}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!shipment ? (
            <Field label="Envío" required>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por tracking, cliente o teléfono…" />
              <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} className="mt-1.5">
                <option value="">Selecciona un envío…</option>
                {(lookup.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.trackingNumber} · {s.customerName} · {s.statusDefinition.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Tipo de incidencia" required>
            <Select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
              {Object.entries(INCIDENT_TYPE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción" required>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe lo ocurrido…" />
          </Field>
          <Field label="Asignar a">
            <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
              <option value="">Sin asignar</option>
              {users.filter((u) => u.active).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} className="accent-slate-900" />
            Mover el envío al estado <strong>Incidencia</strong>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            Registrar incidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

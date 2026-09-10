import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Plus } from 'lucide-react';
import { INCIDENT_STATUS_META, INCIDENT_TYPE_LABELS, IncidentStatus, type IncidentView } from '@trackcontrol/shared';
import { useIncidents, useUpdateIncident } from '@/hooks/use-operations';
import { useUsers } from '@/hooks/use-catalogs';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Select, Textarea } from '@/components/ui/input';
import { IncidentDialog } from '@/components/shipments/incident-dialog';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatRelative } from '@/lib/utils';

type Filter = 'ALL' | IncidentStatus;

export function IncidentsPage() {
  const { can } = useCurrentUser();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<IncidentView | null>(null);
  const all = useIncidents();
  const rows = (all.data ?? []).filter((i) => filter === 'ALL' || i.status === filter);
  const count = (s: IncidentStatus) => (all.data ?? []).filter((i) => i.status === s).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Incidencias"
        description="Problemas reportados sobre envíos: dirección incorrecta, cliente no responde, paquete dañado, etc."
        actions={
          can('incidents:write') ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Registrar incidencia
            </Button>
          ) : null
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard compact label="Abiertas" value={count(IncidentStatus.ABIERTA)} color="red" icon={AlertTriangle} onClick={() => setFilter(IncidentStatus.ABIERTA)} />
        <StatCard compact label="En revisión" value={count(IncidentStatus.EN_REVISION)} color="amber" onClick={() => setFilter(IncidentStatus.EN_REVISION)} />
        <StatCard compact label="Resueltas" value={count(IncidentStatus.RESUELTA)} color="emerald" onClick={() => setFilter(IncidentStatus.RESUELTA)} />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'ALL', label: 'Todas', count: all.data?.length },
              { value: IncidentStatus.ABIERTA, label: 'Abiertas', count: count(IncidentStatus.ABIERTA) },
              { value: IncidentStatus.EN_REVISION, label: 'En revisión', count: count(IncidentStatus.EN_REVISION) },
              { value: IncidentStatus.RESUELTA, label: 'Resueltas', count: count(IncidentStatus.RESUELTA) },
            ]}
            className="w-fit"
          />
        </div>
        {all.isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Sin incidencias en esta vista" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Envío</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Reportada</TableHead>
                <TableHead>Asignada a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resolución</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => setEditing(i)}>
                  <TableCell>
                    {i.shipment ? (
                      <Link to={`/paquetes/${i.shipment.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:underline">
                        {i.shipment.trackingNumber}
                      </Link>
                    ) : '—'}
                    <p className="text-[11px] text-slate-400">{i.shipment?.customerName}</p>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{INCIDENT_TYPE_LABELS[i.type]}</TableCell>
                  <TableCell className="max-w-[320px] text-slate-600">
                    <p className="line-clamp-2">{i.description}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-slate-700">{formatRelative(i.createdAt)}</p>
                    <p className="text-[11px] text-slate-400">{i.reportedBy?.name ?? 'Sistema'}</p>
                  </TableCell>
                  <TableCell className="text-slate-600">{i.assignedTo?.name ?? <span className="text-slate-400">Sin asignar</span>}</TableCell>
                  <TableCell>
                    <Badge color={INCIDENT_STATUS_META[i.status].color} dot>
                      {INCIDENT_STATUS_META[i.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] text-xs text-slate-500">
                    <p className="line-clamp-2">{i.resolution ?? '—'}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <IncidentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditIncidentDialog incident={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditIncidentDialog({ incident, onClose }: { incident: IncidentView | null; onClose: () => void }) {
  const { can } = useCurrentUser();
  const { data: users = [] } = useUsers();
  const update = useUpdateIncident();
  const [status, setStatus] = useState<IncidentStatus>(IncidentStatus.ABIERTA);
  const [resolution, setResolution] = useState('');
  const [assigned, setAssigned] = useState('');
  const [key, setKey] = useState<string | null>(null);
  if (incident && key !== incident.id) {
    setKey(incident.id);
    setStatus(incident.status);
    setResolution(incident.resolution ?? '');
    setAssigned(incident.assignedUserId ?? '');
  }
  if (!incident && key !== null) setKey(null);

  const submit = async () => {
    if (!incident) return;
    try {
      await update.mutateAsync({ id: incident.id, status, resolution: resolution || null, assignedUserId: assigned || null });
      toast.success('Incidencia actualizada');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{incident ? INCIDENT_TYPE_LABELS[incident.type] : ''}</DialogTitle>
          <DialogDescription>
            {incident?.shipment?.trackingNumber} · {incident?.shipment?.customerName} · {formatDateTime(incident?.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{incident?.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estado">
              <Select value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)} disabled={!can('incidents:write')}>
                {Object.entries(INCIDENT_STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Asignada a">
              <Select value={assigned} onChange={(e) => setAssigned(e.target.value)} disabled={!can('incidents:write')}>
                <option value="">Sin asignar</option>
                {users.filter((u) => u.active).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Resolución" hint="Describe cómo se resolvió o qué acción se tomó.">
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={!can('incidents:write')} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {can('incidents:write') ? (
            <Button onClick={submit} loading={update.isPending}>
              Guardar
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

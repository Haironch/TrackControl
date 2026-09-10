import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Pencil, Phone, Plus, Power, User } from 'lucide-react';
import type { CarrierView, CreateCarrierDto } from '@trackcontrol/shared';
import { useCarriers } from '@/hooks/use-catalogs';
import { useCreateCarrier, useToggleCarrier, useUpdateCarrier } from '@/hooks/use-operations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';

const COLORS = ['#0ea5e9', '#f97316', '#ef4444', '#8b5cf6', '#10b981', '#eab308', '#ec4899', '#14b8a6', '#6366f1', '#64748b'];

export function CarriersPage() {
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const { data: carriers, isLoading } = useCarriers();
  const toggle = useToggleCarrier();
  const [editing, setEditing] = useState<CarrierView | null | 'new'>(null);
  const canWrite = can('carriers:write');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paqueterías"
        description="Catálogo de empresas de transporte con su rendimiento y dinero pendiente."
        actions={
          canWrite ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nueva paquetería
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="h-56" />) : null}
        {carriers?.map((c) => (
          <Card key={c.id} className={cn('overflow-hidden', !c.active && 'opacity-60')}>
            <div className="h-1.5" style={{ backgroundColor: c.color }} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">Código {c.code}</p>
                  </div>
                </div>
                <Badge color={c.active ? 'emerald' : 'slate'} dot>
                  {c.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <User className="size-3.5" /> {c.contactName}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {c.phone}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric label="Paquetes" value={c.stats.totalShipments} />
                <Metric label="Entregados" value={c.stats.delivered} />
                <Metric label="Tasa entrega" value={formatPercent(c.stats.deliveryRate)} tone={c.stats.deliveryRate >= 85 ? 'good' : c.stats.deliveryRate >= 70 ? 'warn' : 'bad'} />
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cobrado</span>
                  <span className="font-medium tabular">{formatCurrency(c.stats.collected)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Liquidado</span>
                  <span className="font-medium text-emerald-700 tabular">{formatCurrency(c.stats.settled)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-semibold text-slate-700">Pendiente</span>
                  <span className={cn('font-bold tabular', c.stats.pending > 0 ? 'text-amber-600' : 'text-slate-700')}>{formatCurrency(c.stats.pending)}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => navigate(`/paquetes?carrierId=${c.id}`)}>
                  Ver paquetes
                </Button>
                {canWrite ? (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} title="Editar">
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={c.active ? 'Desactivar' : 'Activar'}
                      onClick={async () => {
                        try {
                          await toggle.mutateAsync(c.id);
                          toast.success(`${c.name} ${c.active ? 'desactivada' : 'activada'}`);
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      <Power className={c.active ? 'text-emerald-600' : 'text-slate-400'} />
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <CarrierDialog carrier={editing === 'new' ? null : editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-100 p-2">
      <p className={cn('text-lg font-bold tabular', color)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function CarrierDialog({ carrier, open, onOpenChange }: { carrier: CarrierView | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCarrier();
  const update = useUpdateCarrier();
  const [form, setForm] = useState<CreateCarrierDto>({ name: '', phone: '', contactName: '', email: '', color: COLORS[0], active: true });
  const [key, setKey] = useState<string | null>(null);
  const currentKey = carrier?.id ?? 'new';
  if (open && key !== currentKey) {
    setKey(currentKey);
    setForm(carrier ? { name: carrier.name, phone: carrier.phone, contactName: carrier.contactName, email: carrier.email ?? '', color: carrier.color, active: carrier.active } : { name: '', phone: '', contactName: '', email: '', color: COLORS[0], active: true });
  }
  if (!open && key !== null) setKey(null);

  const submit = async () => {
    try {
      const dto = { ...form, email: form.email || null };
      if (carrier) await update.mutateAsync({ id: carrier.id, ...dto });
      else await create.mutateAsync(dto);
      toast.success(carrier ? 'Paquetería actualizada' : 'Paquetería creada');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{carrier ? 'Editar paquetería' : 'Nueva paquetería'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Contacto" required>
            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Correo" className="sm:col-span-2">
            <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Color identificativo" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={cn('size-7 rounded-full ring-2 ring-offset-2 transition', form.color === c ? 'ring-slate-900' : 'ring-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={create.isPending || update.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

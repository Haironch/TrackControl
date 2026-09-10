import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, PaymentMethod, SETTLEMENT_STATUS_META, SettlementStatus, type SettlementView } from '@trackcontrol/shared';
import { useCarriers } from '@/hooks/use-catalogs';
import { useCancelSettlement, useConfirmSettlement, useCreateSettlement, usePendingSettlementShipments, useSettlement } from '@/hooks/use-operations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CarrierChip } from '@/components/shipments/badges';
import { errorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate, formatDateTime, toDateInputValue } from '@/lib/utils';

export function CreateSettlementDialog({ open, onOpenChange, defaultCarrierId }: { open: boolean; onOpenChange: (o: boolean) => void; defaultCarrierId?: string }) {
  const { data: carriers = [] } = useCarriers();
  const create = useCreateSettlement();
  const [carrierId, setCarrierId] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualAmount, setManualAmount] = useState<string>('');
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.DEPOSITO);
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(true);
  const pending = usePendingSettlementShipments(carrierId || undefined);

  useEffect(() => {
    if (open) {
      setCarrierId(defaultCarrierId ?? '');
      setDate(toDateInputValue(new Date()));
      setSelected(new Set());
      setManualAmount('');
      setReference('');
      setBank('');
      setNotes('');
      setConfirm(true);
    }
  }, [open, defaultCarrierId]);

  useEffect(() => {
    setSelected(new Set());
  }, [carrierId]);

  const rows = pending.data ?? [];
  const totalCollected = useMemo(() => rows.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.amountToCollect, 0), [rows, selected]);
  const totalAmount = manualAmount === '' ? totalCollected : Number(manualAmount);
  const adjustment = totalAmount - totalCollected;
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    if (!carrierId || selected.size === 0) {
      toast.error('Selecciona la paquetería y al menos un envío.');
      return;
    }
    try {
      const created = await create.mutateAsync({
        carrierId,
        date: new Date(`${date}T12:00:00`).toISOString(),
        shipmentIds: [...selected],
        totalAmount: manualAmount === '' ? undefined : Number(manualAmount),
        reference: reference || null,
        notes: notes || null,
        confirm,
        payment: confirm ? { method, reference: reference || null, bankName: bank || null } : null,
      });
      toast.success(`Liquidación ${created.number} registrada`, { description: confirm ? `${created.shipmentsCount} envíos pasaron a Liquidado.` : 'Pendiente de confirmar el depósito.' });
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Registrar liquidación</DialogTitle>
          <DialogDescription>Selecciona los envíos entregados que la paquetería está pagando en este depósito.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Paquetería" required>
              <Select value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
                <option value="">Selecciona…</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · pendiente {formatCurrency(c.stats.pending)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha del depósito" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Referencia / No. de depósito">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="DEP-123456" />
            </Field>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-slate-700">
                <input type="checkbox" className="accent-slate-900" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} disabled={!rows.length} />
                Envíos pendientes de liquidar ({rows.length})
              </label>
              <span className="text-slate-500">
                Seleccionados: <strong>{selected.size}</strong>
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {!carrierId ? (
                <p className="p-6 text-center text-xs text-slate-400">Selecciona una paquetería para ver sus envíos entregados pendientes de pago.</p>
              ) : pending.isLoading ? (
                <div className="space-y-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : rows.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">Esta paquetería no tiene envíos pendientes de liquidar.</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((s) => (
                      <tr key={s.id} className={cn('cursor-pointer hover:bg-slate-50', selected.has(s.id) && 'bg-brand-50/60')} onClick={() => toggle(s.id)}>
                        <td className="w-8 px-3 py-2">
                          <input type="checkbox" className="accent-slate-900" checked={selected.has(s.id)} onChange={() => toggle(s.id)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td className="px-2 py-2 font-semibold text-slate-800">{s.trackingNumber}</td>
                        <td className="px-2 py-2 text-slate-600">{s.customerName}</td>
                        <td className="px-2 py-2 text-slate-500">{s.municipality}</td>
                        <td className="px-2 py-2 text-slate-500 tabular">Entregado {formatDate(s.deliveredAt)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular">{formatCurrency(s.amountToCollect)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-900 p-4 text-white sm:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cobrado a clientes</p>
              <p className="mt-1 text-xl font-bold tabular">{formatCurrency(totalCollected)}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Monto liquidado</p>
              <p className="text-xl font-bold text-brand-300 tabular">{formatCurrency(totalAmount)}</p>
              {adjustment !== 0 ? <p className={cn('mt-1 text-xs font-medium', adjustment < 0 ? 'text-rose-300' : 'text-emerald-300')}>Ajuste {formatCurrency(adjustment)}</p> : null}
            </div>
            <div className="space-y-3 sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Monto depositado" hint="Vacío = igual a lo cobrado">
                  <Input type="number" min={0} step="0.01" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder={totalCollected.toFixed(2)} />
                </Field>
                <Field label="Método de pago">
                  <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Banco">
                  <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Banco Industrial" />
                </Field>
              </div>
              <Field label="Notas">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[56px]" />
              </Field>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="accent-slate-900" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                Confirmar de inmediato (los envíos pasan a <strong>Liquidado</strong>)
              </label>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={selected.size === 0}>
            Registrar liquidación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: s, isLoading } = useSettlement(id ?? undefined);
  const { can } = useCurrentUser();
  const confirm = useConfirmSettlement();
  const cancel = useCancelSettlement();

  const run = async (fn: () => Promise<SettlementView>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Liquidación {s?.number ?? ''}
            {s ? <Badge color={SETTLEMENT_STATUS_META[s.status].color}>{SETTLEMENT_STATUS_META[s.status].label}</Badge> : null}
          </DialogTitle>
          <DialogDescription>{s ? `${s.carrier.name} · ${formatDate(s.date)} · Registrada por ${s.createdBy?.name ?? 'Sistema'}` : ''}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {isLoading || !s ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Paquetes" value={String(s.shipmentsCount)} />
                <Stat label="Cobrado" value={formatCurrency(s.totalCollected)} />
                <Stat label="Liquidado" value={formatCurrency(s.totalAmount)} tone="good" />
                <Stat label="Ajuste" value={formatCurrency(s.adjustment)} tone={s.adjustment < 0 ? 'bad' : undefined} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <CarrierChip name={s.carrier.name} color={s.carrier.color} />
                {s.reference ? <span>Ref. {s.reference}</span> : null}
                {s.payments.map((p) => (
                  <span key={p.id}>
                    {PAYMENT_METHOD_LABELS[p.method]} {p.bankName ? `· ${p.bankName}` : ''} · {formatCurrency(p.amount)}
                  </span>
                ))}
                {s.confirmedAt ? <span>Confirmada {formatDateTime(s.confirmedAt)}</span> : null}
              </div>
              {s.notes ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{s.notes}</p> : null}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Tracking</th>
                      <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                      <th className="px-3 py-2 text-left font-semibold">Entregado</th>
                      <th className="px-3 py-2 text-right font-semibold">Cobrado</th>
                      <th className="px-3 py-2 text-right font-semibold">Liquidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.details.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{d.shipment?.trackingNumber ?? d.shipmentId}</td>
                        <td className="px-3 py-2 text-slate-600">{d.shipment?.customerName}</td>
                        <td className="px-3 py-2 text-slate-500 tabular">{formatDate(d.shipment?.deliveredAt)}</td>
                        <td className="px-3 py-2 text-right tabular">{formatCurrency(d.amountCollected)}</td>
                        <td className={cn('px-3 py-2 text-right font-medium tabular', d.adjustment !== 0 && 'text-rose-600')}>{formatCurrency(d.amountSettled)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogBody>
        {s && can('settlements:write') && s.status !== SettlementStatus.ANULADA ? (
          <DialogFooter className="justify-between">
            <Button variant="ghost" className="text-red-600" loading={cancel.isPending} onClick={() => run(() => cancel.mutateAsync(s.id), 'Liquidación anulada; los envíos vuelven a Por liquidar')}>
              <XCircle /> Anular
            </Button>
            {s.status === SettlementStatus.PENDIENTE ? (
              <Button variant="success" loading={confirm.isPending} onClick={() => run(() => confirm.mutateAsync(s.id), 'Liquidación confirmada')}>
                <CheckCircle2 /> Confirmar depósito
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular', tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

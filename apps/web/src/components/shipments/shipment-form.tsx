import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PAYMENT_TYPE_LABELS, PaymentType, type CreateShipmentDto, type ShipmentView } from '@trackcontrol/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useCarriers, useCustomers, useUsers } from '@/hooks/use-catalogs';
import { formatCurrency, toDateInputValue } from '@/lib/utils';

const DEPARTMENTS = [
  'Guatemala', 'Quetzaltenango', 'Sacatepéquez', 'Escuintla', 'Huehuetenango', 'Alta Verapaz', 'Baja Verapaz', 'Petén', 'Izabal', 'Chimaltenango', 'Sololá',
  'Retalhuleu', 'San Marcos', 'Jutiapa', 'Jalapa', 'Zacapa', 'Chiquimula', 'Suchitepéquez', 'Totonicapán', 'El Progreso', 'Santa Rosa', 'Quiché',
];

const productSchema = z.object({ name: z.string().min(1, 'Nombre requerido'), quantity: z.coerce.number().int().min(1, 'Mín. 1'), unitPrice: z.coerce.number().min(0) });
const schema = z.object({
  carrierId: z.string().min(1, 'Selecciona una paquetería'),
  customerName: z.string().min(2, 'Nombre requerido'),
  customerPhone: z.string().min(6, 'Teléfono inválido'),
  address: z.string().min(3, 'Dirección requerida'),
  department: z.string().min(2, 'Selecciona un departamento'),
  municipality: z.string().min(2, 'Municipio requerido'),
  description: z.string().min(2, 'Descripción requerida'),
  products: z.array(productSchema).min(1, 'Agrega al menos un producto'),
  shippingCost: z.coerce.number().min(0),
  amountToCollect: z.coerce.number().min(0),
  paymentType: z.nativeEnum(PaymentType),
  carrierGuideNumber: z.string().optional(),
  estimatedDeliveryAt: z.string().optional(),
  assignedUserId: z.string().optional(),
  notes: z.string().optional(),
});

export type ShipmentFormValues = z.infer<typeof schema>;

interface Props {
  initial?: ShipmentView | null;
  submitting: boolean;
  onSubmit: (dto: CreateShipmentDto) => void;
  onCancel: () => void;
}

function toInitial(s?: ShipmentView | null): ShipmentFormValues {
  return {
    carrierId: s?.carrierId ?? '',
    customerName: s?.customerName ?? '',
    customerPhone: s?.customerPhone ?? '',
    address: s?.address ?? '',
    department: s?.department ?? 'Guatemala',
    municipality: s?.municipality ?? '',
    description: s?.description ?? '',
    products: s?.products.length ? s.products.map((p) => ({ name: p.name, quantity: p.quantity, unitPrice: p.unitPrice })) : [{ name: '', quantity: 1, unitPrice: 0 }],
    shippingCost: s?.shippingCost ?? 30,
    amountToCollect: s?.amountToCollect ?? 0,
    paymentType: (s?.paymentType as PaymentType) ?? PaymentType.CONTRA_ENTREGA,
    carrierGuideNumber: s?.carrierGuideNumber ?? '',
    estimatedDeliveryAt: toDateInputValue(s?.estimatedDeliveryAt),
    assignedUserId: s?.assignedUserId ?? '',
    notes: s?.notes ?? '',
  };
}

export function ShipmentForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<ShipmentFormValues>(() => toInitial(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerId, setCustomerId] = useState<string | null>(initial?.customerId ?? null);
  const [manualAmount, setManualAmount] = useState(!!initial);
  const { data: carriers = [] } = useCarriers();
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();

  const productValue = useMemo(() => values.products.reduce((a, p) => a + Number(p.quantity || 0) * Number(p.unitPrice || 0), 0), [values.products]);
  const suggestedAmount = values.paymentType === PaymentType.CONTRA_ENTREGA ? productValue + Number(values.shippingCost || 0) : 0;
  const amountToCollect = manualAmount ? Number(values.amountToCollect || 0) : suggestedAmount;

  const set = <K extends keyof ShipmentFormValues>(key: K, value: ShipmentFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setProduct = (i: number, patch: Partial<ShipmentFormValues['products'][number]>) =>
    setValues((v) => ({ ...v, products: v.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));

  const pickCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setCustomerId(id || null);
    if (c) setValues((v) => ({ ...v, customerName: c.name, customerPhone: c.phone, address: c.address, department: c.department, municipality: c.municipality }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...values, amountToCollect });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join('.')] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    const d = parsed.data;
    onSubmit({
      carrierId: d.carrierId,
      customerId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      address: d.address,
      department: d.department,
      municipality: d.municipality,
      description: d.description,
      products: d.products,
      productValue,
      amountToCollect: d.paymentType === PaymentType.CONTRA_ENTREGA ? d.amountToCollect : 0,
      shippingCost: d.shippingCost,
      paymentType: d.paymentType,
      carrierGuideNumber: d.carrierGuideNumber || null,
      estimatedDeliveryAt: d.estimatedDeliveryAt ? new Date(`${d.estimatedDeliveryAt}T12:00:00`).toISOString() : null,
      assignedUserId: d.assignedUserId || null,
      notes: d.notes || null,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente y destino</CardTitle>
            <CardDescription>Selecciona un cliente existente o escribe los datos de uno nuevo. Se creará automáticamente por teléfono.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {!initial ? (
              <Field label="Cliente existente" className="sm:col-span-2">
                <Select value={customerId ?? ''} onChange={(e) => pickCustomer(e.target.value)}>
                  <option value="">— Nuevo cliente —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone} · {c.municipality}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Nombre del cliente" required error={errors.customerName}>
              <Input value={values.customerName} onChange={(e) => set('customerName', e.target.value)} aria-invalid={!!errors.customerName} />
            </Field>
            <Field label="Teléfono" required error={errors.customerPhone}>
              <Input value={values.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="+502 5555-1234" aria-invalid={!!errors.customerPhone} />
            </Field>
            <Field label="Dirección" required error={errors.address} className="sm:col-span-2">
              <Input value={values.address} onChange={(e) => set('address', e.target.value)} placeholder="Calle, número, zona, referencias" aria-invalid={!!errors.address} />
            </Field>
            <Field label="Departamento" required error={errors.department}>
              <Select value={values.department} onChange={(e) => set('department', e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Municipio" required error={errors.municipality}>
              <Input value={values.municipality} onChange={(e) => set('municipality', e.target.value)} aria-invalid={!!errors.municipality} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contenido del paquete</CardTitle>
            <CardDescription>Los productos determinan el valor del paquete.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Descripción del paquete" required error={errors.description}>
              <Input value={values.description} onChange={(e) => set('description', e.target.value)} placeholder="Ej. Caja mediana - 2 productos" aria-invalid={!!errors.description} />
            </Field>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_110px_36px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Producto</span>
                <span>Cant.</span>
                <span>Precio</span>
                <span />
              </div>
              {values.products.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_110px_36px] gap-2">
                  <Input value={p.name} onChange={(e) => setProduct(i, { name: e.target.value })} placeholder="Nombre del producto" aria-invalid={!!errors[`products.${i}.name`]} />
                  <Input type="number" min={1} value={p.quantity} onChange={(e) => setProduct(i, { quantity: Number(e.target.value) })} />
                  <Input type="number" min={0} step="0.01" value={p.unitPrice} onChange={(e) => setProduct(i, { unitPrice: Number(e.target.value) })} />
                  <Button type="button" variant="ghost" size="icon" disabled={values.products.length === 1} onClick={() => set('products', values.products.filter((_, idx) => idx !== i))}>
                    <Trash2 className="text-slate-400" />
                  </Button>
                </div>
              ))}
              {errors.products ? <p className="text-xs text-red-600">{errors.products}</p> : null}
              <Button type="button" variant="outline" size="sm" onClick={() => set('products', [...values.products, { name: '', quantity: 1, unitPrice: 0 }])}>
                <Plus /> Agregar producto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Envío y cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Paquetería" required error={errors.carrierId}>
              <Select value={values.carrierId} onChange={(e) => set('carrierId', e.target.value)} aria-invalid={!!errors.carrierId}>
                <option value="">Selecciona…</option>
                {carriers.filter((c) => c.active || c.id === values.carrierId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Número de guía" hint="Puedes agregarlo después al entregar a la paquetería.">
              <Input value={values.carrierGuideNumber} onChange={(e) => set('carrierGuideNumber', e.target.value)} />
            </Field>
            <Field label="Tipo de pago" required>
              <Select value={values.paymentType} onChange={(e) => set('paymentType', e.target.value as PaymentType)}>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Costo de envío (Q)" required>
              <Input type="number" min={0} step="0.01" value={values.shippingCost} onChange={(e) => set('shippingCost', Number(e.target.value))} />
            </Field>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Valor de productos</span>
                <span className="font-medium text-slate-800 tabular">{formatCurrency(productValue)}</span>
              </div>
              <div className="mt-1 flex justify-between text-slate-500">
                <span>Costo de envío</span>
                <span className="font-medium text-slate-800 tabular">{formatCurrency(Number(values.shippingCost || 0))}</span>
              </div>
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Monto a cobrar</span>
                  <span className="text-base font-bold text-slate-900 tabular">{formatCurrency(amountToCollect)}</span>
                </div>
                {values.paymentType === PaymentType.CONTRA_ENTREGA ? (
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" checked={manualAmount} onChange={(e) => { setManualAmount(e.target.checked); if (e.target.checked) set('amountToCollect', suggestedAmount); }} className="accent-slate-900" />
                    Ajustar monto manualmente
                  </label>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Sin cobro contra entrega.</p>
                )}
                {manualAmount && values.paymentType === PaymentType.CONTRA_ENTREGA ? (
                  <Input type="number" min={0} step="0.01" className="mt-2" value={values.amountToCollect} onChange={(e) => set('amountToCollect', Number(e.target.value))} />
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Fecha estimada de entrega">
              <Input type="date" value={values.estimatedDeliveryAt} onChange={(e) => set('estimatedDeliveryAt', e.target.value)} />
            </Field>
            <Field label="Usuario responsable">
              <Select value={values.assignedUserId} onChange={(e) => set('assignedUserId', e.target.value)}>
                <option value="">Yo (usuario actual)</option>
                {users.filter((u) => u.active).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observaciones">
              <Textarea value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Instrucciones de entrega, referencias…" />
            </Field>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={submitting}>
            {initial ? 'Guardar cambios' : 'Crear envío'}
          </Button>
        </div>
      </div>
    </form>
  );
}

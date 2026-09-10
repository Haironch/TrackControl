import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, Pencil, Plus, Search, UserSquare2 } from 'lucide-react';
import type { CreateCustomerDto, CustomerView } from '@trackcontrol/shared';
import { useCustomers } from '@/hooks/use-catalogs';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-operations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Field } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { errorMessage } from '@/lib/api';
import { cn, formatCurrency, formatDate, formatPercent } from '@/lib/utils';

export function CustomersPage() {
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const [search, setSearch] = useState('');
  const { data: customers, isLoading } = useCustomers(search || undefined);
  const [editing, setEditing] = useState<CustomerView | null | 'new'>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Historial de pedidos por cliente. Detecta clientes con muchas devoluciones."
        actions={
          can('customers:write') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Nuevo cliente
            </Button>
          ) : null
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por nombre, teléfono o municipio…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : !customers?.length ? (
          <EmptyState icon={UserSquare2} title="No hay clientes" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Entregados</TableHead>
                <TableHead className="text-right">Rechazados</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="text-right">Comprado</TableHead>
                <TableHead>Último pedido</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const rejectRate = c.stats.orders ? (c.stats.rejected / c.stats.orders) * 100 : 0;
                const risky = c.stats.rejected >= 2 || rejectRate >= 40;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/paquetes?customerId=${c.id}`)}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-slate-400">{c.address}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular text-slate-600">{c.phone}</TableCell>
                    <TableCell>
                      <p className="text-slate-700">{c.municipality}</p>
                      <p className="text-[11px] text-slate-400">{c.department}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular">{c.stats.orders}</TableCell>
                    <TableCell className="text-right text-emerald-700 tabular">{c.stats.delivered}</TableCell>
                    <TableCell className={cn('text-right tabular', c.stats.rejected > 0 ? 'font-semibold text-red-600' : 'text-slate-500')}>{c.stats.rejected}</TableCell>
                    <TableCell>
                      {risky ? (
                        <Tooltip content={`${formatPercent(rejectRate)} de rechazo`}>
                          <span>
                            <Badge color="red" size="sm">
                              <AlertCircle className="size-3" /> Alto
                            </Badge>
                          </span>
                        </Tooltip>
                      ) : c.stats.rejected > 0 ? (
                        <Badge color="amber" size="sm">
                          Medio
                        </Badge>
                      ) : (
                        <Badge color="emerald" size="sm">
                          Bajo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(c.stats.totalSpent)}</TableCell>
                    <TableCell className="text-slate-500 tabular">{formatDate(c.stats.lastOrderAt)}</TableCell>
                    <TableCell className="text-right">
                      {can('customers:write') ? (
                        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setEditing(c); }}>
                          <Pencil />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      <CustomerDialog customer={editing === 'new' ? null : editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

const empty: CreateCustomerDto = { name: '', phone: '', address: '', department: 'Guatemala', municipality: '', email: '', notes: '' };

function CustomerDialog({ customer, open, onOpenChange }: { customer: CustomerView | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [form, setForm] = useState<CreateCustomerDto>(empty);
  const [key, setKey] = useState<string | null>(null);
  const currentKey = customer?.id ?? 'new';
  if (open && key !== currentKey) {
    setKey(currentKey);
    setForm(customer ? { name: customer.name, phone: customer.phone, address: customer.address, department: customer.department, municipality: customer.municipality, email: customer.email ?? '', notes: customer.notes ?? '' } : empty);
  }
  if (!open && key !== null) setKey(null);

  const submit = async () => {
    try {
      const dto = { ...form, email: form.email || null, notes: form.notes || null };
      if (customer) await update.mutateAsync({ id: customer.id, ...dto });
      else await create.mutateAsync(dto);
      toast.success(customer ? 'Cliente actualizado' : 'Cliente creado');
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Correo">
            <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Dirección" required className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Departamento" required>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="Municipio" required>
            <Input value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
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

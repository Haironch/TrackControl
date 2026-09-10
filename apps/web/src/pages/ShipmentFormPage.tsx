import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useCreateShipment, useShipment, useUpdateShipment } from '@/hooks/use-shipments';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ShipmentForm } from '@/components/shipments/shipment-form';
import { errorMessage } from '@/lib/api';

export function ShipmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const existing = useShipment(id);
  const create = useCreateShipment();
  const update = useUpdateShipment(id ?? '');

  if (editing && existing.isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <Link to={editing ? `/paquetes/${id}` : '/paquetes'} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-3.5" /> {editing ? existing.data?.trackingNumber : 'Paquetes'}
      </Link>
      <PageHeader
        title={editing ? `Editar envío ${existing.data?.trackingNumber ?? ''}` : 'Crear envío'}
        description={editing ? 'Modifica los datos del envío. Los cambios quedan registrados en el historial.' : 'Registra un nuevo paquete para enviarlo con una paquetería.'}
      />
      <ShipmentForm
        key={existing.data?.id ?? 'new'}
        initial={existing.data}
        submitting={create.isPending || update.isPending}
        onCancel={() => navigate(-1)}
        onSubmit={async (dto) => {
          try {
            if (editing) {
              await update.mutateAsync(dto);
              toast.success('Envío actualizado');
              navigate(`/paquetes/${id}`);
            } else {
              const created = await create.mutateAsync(dto);
              toast.success(`Envío ${created.trackingNumber} creado`, { description: 'Ya aparece en el dashboard y en la tabla de paquetes.' });
              navigate(`/paquetes/${created.id}`);
            }
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </div>
  );
}

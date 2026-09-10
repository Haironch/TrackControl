import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import type { ShipmentQuery } from '@trackcontrol/shared';
import { useShipments } from '@/hooks/use-shipments';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { ShipmentFilters } from '@/components/shipments/shipment-filters';
import { ShipmentTable } from '@/components/shipments/shipment-table';

const KEYS: (keyof ShipmentQuery)[] = ['search', 'status', 'category', 'carrierId', 'customerId', 'department', 'financialStatus', 'paymentType', 'from', 'to', 'page', 'pageSize', 'sortBy', 'sortDir'];

/** Los filtros viven en la URL para que sean compartibles y sobrevivan a la navegación. */
export function useShipmentQueryParams() {
  const [params, setParams] = useSearchParams();
  const query = useMemo<ShipmentQuery>(() => {
    const q: Record<string, unknown> = {};
    for (const k of KEYS) {
      const v = params.get(k);
      if (v) q[k] = k === 'page' || k === 'pageSize' ? Number(v) : v;
    }
    return { page: 1, pageSize: 20, sortBy: 'createdAt', sortDir: 'desc', ...q } as ShipmentQuery;
  }, [params]);

  const update = useCallback(
    (patch: Partial<ShipmentQuery>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  return { query, update, reset };
}

export function ShipmentsPage() {
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const { query, update, reset } = useShipmentQueryParams();
  const shipments = useShipments(query);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paquetes"
        description={shipments.data ? `${shipments.data.meta.total} envíos encontrados` : 'Control de todos los envíos gestionados con paqueterías.'}
        actions={
          <>
            <Tooltip content="Exportación a Excel disponible próximamente">
              <span>
                <Button variant="secondary" disabled>
                  <Download /> Exportar
                </Button>
              </span>
            </Tooltip>
            {can('shipments:create') ? (
              <Button onClick={() => navigate('/paquetes/nuevo')}>
                <Plus /> Crear envío
              </Button>
            ) : null}
          </>
        }
      />
      <Card className="overflow-hidden">
        <ShipmentFilters query={query} onChange={update} onReset={reset} />
        <ShipmentTable data={shipments.data?.data} meta={shipments.data?.meta} loading={shipments.isLoading || shipments.isFetching} query={query} onQueryChange={update} />
      </Card>
    </div>
  );
}

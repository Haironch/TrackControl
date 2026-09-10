import { Search, X } from 'lucide-react';
import { FINANCIAL_STATUS_META, STATUS_CATEGORY_META, type FinancialStatus, type ShipmentQuery, type StatusCategory } from '@trackcontrol/shared';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCarriers, useShipmentFacets, useStatuses } from '@/hooks/use-catalogs';

interface Props {
  query: ShipmentQuery;
  onChange: (patch: Partial<ShipmentQuery>) => void;
  onReset: () => void;
}

export function ShipmentFilters({ query, onChange, onReset }: Props) {
  const { data: statuses = [] } = useStatuses();
  const { data: carriers = [] } = useCarriers();
  const { data: facets } = useShipmentFacets();
  const hasFilters = !!(query.search || query.status || query.category || query.carrierId || query.department || query.financialStatus || query.from || query.to);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar tracking, guía, cliente, teléfono…"
            value={query.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          />
        </div>
        <Select className="w-auto min-w-[160px]" value={query.category ?? ''} onChange={(e) => onChange({ category: (e.target.value || undefined) as StatusCategory | undefined, status: undefined, page: 1 })}>
          <option value="">Todas las etapas</option>
          {Object.entries(STATUS_CATEGORY_META).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[170px]" value={query.status ?? ''} onChange={(e) => onChange({ status: e.target.value || undefined, category: undefined, page: 1 })}>
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[160px]" value={query.carrierId ?? ''} onChange={(e) => onChange({ carrierId: e.target.value || undefined, page: 1 })}>
          <option value="">Todas las paqueterías</option>
          {carriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[160px]" value={query.department ?? ''} onChange={(e) => onChange({ department: e.target.value || undefined, page: 1 })}>
          <option value="">Todos los departamentos</option>
          {(facets?.departments ?? []).map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.count})
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[160px]" value={query.financialStatus ?? ''} onChange={(e) => onChange({ financialStatus: (e.target.value || undefined) as FinancialStatus | undefined, page: 1 })}>
          <option value="">Estado financiero</option>
          {Object.entries(FINANCIAL_STATUS_META).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" className="w-auto" value={query.from ?? ''} onChange={(e) => onChange({ from: e.target.value || undefined, page: 1 })} />
          <span className="text-xs text-slate-400">a</span>
          <Input type="date" className="w-auto" value={query.to ?? ''} onChange={(e) => onChange({ to: e.target.value || undefined, page: 1 })} />
        </div>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X /> Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

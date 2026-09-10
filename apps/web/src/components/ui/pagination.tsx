import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@trackcontrol/shared';
import { Button } from './button';
import { Select } from './input';

interface Props {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({ meta, onPageChange, onPageSizeChange }: Props) {
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.total, meta.page * meta.pageSize);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="tabular">
          Mostrando <span className="font-medium text-slate-700">{start}–{end}</span> de <span className="font-medium text-slate-700">{meta.total}</span>
        </span>
        {onPageSizeChange ? (
          <Select className="h-7 w-auto py-0 pl-2 pr-7 text-xs" value={meta.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / pág
              </option>
            ))}
          </Select>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular">
          Página {meta.page} de {meta.totalPages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

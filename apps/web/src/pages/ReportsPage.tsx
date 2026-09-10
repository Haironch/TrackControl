import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import type { ReportGroupBy } from '@trackcontrol/shared';
import { useReport, useReportDefinitions } from '@/hooks/use-operations';
import { useCarriers } from '@/hooks/use-catalogs';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate, formatNumber, formatPercent, toDateInputValue } from '@/lib/utils';
import { api, errorMessage } from '@/lib/api';

export function ReportsPage() {
  const defs = useReportDefinitions();
  const { data: carriers = [] } = useCarriers();
  const [reportId, setReportId] = useState('deliveries');
  const [from, setFrom] = useState(() => toDateInputValue(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [carrierId, setCarrierId] = useState('');
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');
  const report = useReport(reportId, { from, to, carrierId: carrierId || undefined, groupBy });

  const exportAs = async (format: 'xlsx' | 'pdf') => {
    try {
      await api.get(`/reports/${reportId}/export/${format}`);
    } catch (e) {
      toast.info(errorMessage(e));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description="Consultas listas para presentar. La exportación a Excel y PDF está prevista en la arquitectura."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportAs('xlsx')}>
              <FileSpreadsheet /> Exportar Excel
            </Button>
            <Button variant="secondary" onClick={() => exportAs('pdf')}>
              <FileText /> Exportar PDF
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Reportes disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(defs.data ?? []).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setReportId(d.id)}
                className={cn('w-full rounded-lg px-3 py-2 text-left transition-colors', reportId === d.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100')}
              >
                <p className="text-sm font-medium">{d.title}</p>
                <p className={cn('text-[11px]', reportId === d.id ? 'text-slate-300' : 'text-slate-500')}>{d.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader className="flex-row flex-wrap items-end gap-3">
            <div className="mr-auto">
              <CardTitle>{report.data?.title ?? 'Reporte'}</CardTitle>
              <CardDescription>{report.data?.description}</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
              <Select className="w-auto" value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
                <option value="">Todas las paqueterías</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {reportId === 'deliveries' ? (
                <Select className="w-auto" value={groupBy} onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}>
                  <option value="day">Por día</option>
                  <option value="week">Por semana</option>
                  <option value="month">Por mes</option>
                </Select>
              ) : null}
              <Button variant="ghost" size="icon" onClick={() => report.refetch()}>
                <RefreshCw className={cn(report.isFetching && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          {report.isLoading ? (
            <TableSkeleton />
          ) : !report.data || report.data.rows.length === 0 ? (
            <EmptyState title="Sin datos para el período" description="Ajusta el rango de fechas o la paquetería." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {report.data.columns.map((c) => (
                    <TableHead key={c.key} className={cn(['number', 'currency', 'percent'].includes(c.type ?? '') && 'text-right')}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.rows.map((row, i) => (
                  <TableRow key={i}>
                    {report.data!.columns.map((c) => (
                      <TableCell key={c.key} className={cn(['number', 'currency', 'percent'].includes(c.type ?? '') && 'text-right tabular')}>
                        {formatCell(row[c.key], c.type)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {report.data.totals ? (
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    {report.data.columns.map((c) => (
                      <TableCell key={c.key} className={cn(['number', 'currency', 'percent'].includes(c.type ?? '') && 'text-right tabular')}>
                        {report.data!.totals![c.key] !== undefined ? formatCell(report.data!.totals![c.key], c.type) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatCell(value: string | number | null | undefined, type?: string) {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'currency':
      return typeof value === 'number' ? formatCurrency(value) : value;
    case 'percent':
      return typeof value === 'number' ? formatPercent(value) : value;
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : value;
    case 'date':
      return typeof value === 'string' && value.length > 10 ? formatDate(value) : value;
    case 'status':
      return <Badge>{String(value)}</Badge>;
    default:
      return String(value);
  }
}

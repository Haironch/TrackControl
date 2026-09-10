import {
  FINANCIAL_STATUS_META,
  FinancialStatus,
  INCIDENT_STATUS_META,
  INCIDENT_TYPE_LABELS,
  SETTLEMENT_STATUS_META,
  StatusCategory,
  isReturnCategory,
  type ReportQuery,
  type ReportTable,
  type Shipment,
} from '@trackcontrol/shared';
import { NotFoundError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { addDays, inRange, monthKey, parseDateParam, startOfDay, toDayKey, weekKey } from '../../core/utils/dates';
import { pct, sum } from '../../core/utils/money';
import type { CarrierService } from '../carriers/carrier.service';
import type { StatusService } from '../statuses/status.service';

export const REPORT_DEFINITIONS = [
  { id: 'deliveries', title: 'Entregas por período', description: 'Paquetes enviados, entregados y devueltos agrupados por día, semana o mes.' },
  { id: 'returns', title: 'Devoluciones', description: 'Paquetes rechazados, en retorno o recibidos en bodega y su valor.' },
  { id: 'carriers', title: 'Rendimiento de paqueterías', description: 'Tasa de entrega, tiempos y dinero pendiente por paquetería.' },
  { id: 'sales', title: 'Ventas entregadas', description: 'Monto cobrado por paquetes entregados en el período.' },
  { id: 'pending-settlement', title: 'Dinero pendiente de liquidación', description: 'Envíos entregados que la paquetería aún no ha pagado.' },
  { id: 'settlements', title: 'Liquidaciones realizadas', description: 'Depósitos y pagos registrados por paquetería.' },
  { id: 'incidents', title: 'Incidencias', description: 'Incidencias registradas por tipo y estado.' },
] as const;

export type ReportId = (typeof REPORT_DEFINITIONS)[number]['id'];

export class ReportService {
  constructor(
    private readonly repos: Repositories,
    private readonly statuses: StatusService,
    private readonly carriers: CarrierService,
  ) {}

  definitions() {
    return REPORT_DEFINITIONS;
  }

  async generate(id: string, query: ReportQuery): Promise<ReportTable> {
    const def = REPORT_DEFINITIONS.find((r) => r.id === id);
    if (!def) throw new NotFoundError('Reporte', id);
    const from = parseDateParam(query.from) ?? addDays(startOfDay(new Date()), -29);
    const to = parseDateParam(query.to, true) ?? new Date();
    const filters = { ...query, from: toDayKey(from), to: toDayKey(to) };
    const base = { id: def.id, title: def.title, description: def.description, generatedAt: new Date().toISOString(), filters };
    const carrierMap = await this.carriers.refMap();
    const catalog = await this.statuses.catalog();
    const cat = new Map(catalog.map((s) => [s.code, s.category]));
    const labelOf = new Map(catalog.map((s) => [s.code, s.label]));
    const shipments = (await this.repos.shipments.findAll()).filter((s) => !query.carrierId || s.carrierId === query.carrierId);
    const carrierName = (cid: string) => carrierMap.get(cid)?.name ?? cid;
    const groupKey = (iso: string) => (query.groupBy === 'month' ? monthKey(iso) : query.groupBy === 'week' ? weekKey(iso) : toDayKey(iso));

    switch (def.id) {
      case 'deliveries': {
        const groups = new Map<string, { shipped: number; delivered: number; returned: number; amount: number }>();
        const bump = (key: string, field: 'shipped' | 'delivered' | 'returned', amount = 0) => {
          const g = groups.get(key) ?? { shipped: 0, delivered: 0, returned: 0, amount: 0 };
          g[field] += 1;
          g.amount = g.amount + amount;
          groups.set(key, g);
        };
        for (const s of shipments) {
          if (inRange(s.deliveredToCarrierAt ?? s.createdAt, from, to)) bump(groupKey(s.deliveredToCarrierAt ?? s.createdAt), 'shipped');
          if (inRange(s.deliveredAt, from, to)) bump(groupKey(s.deliveredAt!), 'delivered', s.amountToCollect);
          if (inRange(s.returnedAt, from, to)) bump(groupKey(s.returnedAt!), 'returned');
        }
        const rows = [...groups.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, g]) => ({ period, shipped: g.shipped, delivered: g.delivered, returned: g.returned, rate: pct(g.delivered, g.delivered + g.returned), amount: sum([g.amount]) }));
        return {
          ...base,
          columns: [
            { key: 'period', label: 'Período', type: 'text' },
            { key: 'shipped', label: 'Enviados', type: 'number' },
            { key: 'delivered', label: 'Entregados', type: 'number' },
            { key: 'returned', label: 'Devueltos', type: 'number' },
            { key: 'rate', label: '% Éxito', type: 'percent' },
            { key: 'amount', label: 'Monto entregado', type: 'currency' },
          ],
          rows,
          totals: {
            period: 'Total',
            shipped: rows.reduce((a, r) => a + r.shipped, 0),
            delivered: rows.reduce((a, r) => a + r.delivered, 0),
            returned: rows.reduce((a, r) => a + r.returned, 0),
            rate: pct(rows.reduce((a, r) => a + r.delivered, 0), rows.reduce((a, r) => a + r.delivered + r.returned, 0)),
            amount: sum(rows.map((r) => r.amount)),
          },
        };
      }
      case 'returns': {
        const rows = shipments
          .filter((s) => isReturnCategory(cat.get(s.status)) && inRange(s.updatedAt, from, to))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((s) => ({
            tracking: s.trackingNumber,
            customer: s.customerName,
            carrier: carrierName(s.carrierId),
            destination: `${s.municipality}, ${s.department}`,
            status: labelOf.get(s.status) ?? s.status,
            productValue: s.productValue,
            shippingCost: s.shippingCost,
            date: s.returnedAt ?? s.updatedAt,
          }));
        return {
          ...base,
          columns: [
            { key: 'tracking', label: 'Tracking', type: 'text' },
            { key: 'customer', label: 'Cliente', type: 'text' },
            { key: 'carrier', label: 'Paquetería', type: 'text' },
            { key: 'destination', label: 'Destino', type: 'text' },
            { key: 'status', label: 'Estado', type: 'status' },
            { key: 'productValue', label: 'Valor productos', type: 'currency' },
            { key: 'shippingCost', label: 'Costo envío', type: 'currency' },
            { key: 'date', label: 'Fecha', type: 'date' },
          ],
          rows,
          totals: { tracking: `${rows.length} paquetes`, productValue: sum(rows.map((r) => r.productValue)), shippingCost: sum(rows.map((r) => r.shippingCost)) },
        };
      }
      case 'carriers': {
        const rows = [...carrierMap.values()].map((c) => {
          const own = shipments.filter((s) => s.carrierId === c.id && inRange(s.createdAt, from, to));
          const d = own.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
          const r = own.filter((s) => isReturnCategory(cat.get(s.status)));
          const inc = own.filter((s) => cat.get(s.status) === StatusCategory.INCIDENT);
          return {
            carrier: c.name,
            total: own.length,
            delivered: d.length,
            returned: r.length,
            incidents: inc.length,
            rate: pct(d.length, d.length + r.length),
            collected: sum(d.map((s) => s.amountToCollect)),
            pending: sum(own.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR).map((s) => s.amountToCollect)),
            shippingCost: sum(own.map((s) => s.shippingCost)),
          };
        });
        return {
          ...base,
          columns: [
            { key: 'carrier', label: 'Paquetería', type: 'text' },
            { key: 'total', label: 'Paquetes', type: 'number' },
            { key: 'delivered', label: 'Entregados', type: 'number' },
            { key: 'returned', label: 'Devueltos', type: 'number' },
            { key: 'incidents', label: 'Incidencias', type: 'number' },
            { key: 'rate', label: 'Tasa entrega', type: 'percent' },
            { key: 'collected', label: 'Cobrado', type: 'currency' },
            { key: 'pending', label: 'Pendiente', type: 'currency' },
            { key: 'shippingCost', label: 'Costo envíos', type: 'currency' },
          ],
          rows,
          totals: {
            carrier: 'Total',
            total: rows.reduce((a, r) => a + r.total, 0),
            delivered: rows.reduce((a, r) => a + r.delivered, 0),
            returned: rows.reduce((a, r) => a + r.returned, 0),
            incidents: rows.reduce((a, r) => a + r.incidents, 0),
            rate: pct(rows.reduce((a, r) => a + r.delivered, 0), rows.reduce((a, r) => a + r.delivered + r.returned, 0)),
            collected: sum(rows.map((r) => r.collected)),
            pending: sum(rows.map((r) => r.pending)),
            shippingCost: sum(rows.map((r) => r.shippingCost)),
          },
        };
      }
      case 'sales': {
        const rows = shipments
          .filter((s) => cat.get(s.status) === StatusCategory.DELIVERED && inRange(s.deliveredAt, from, to))
          .sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? ''))
          .map((s) => this.shipmentRow(s, carrierName, labelOf));
        return { ...base, columns: this.shipmentColumns(), rows, totals: this.shipmentTotals(rows) };
      }
      case 'pending-settlement': {
        const rows = shipments
          .filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR || s.financialStatus === FinancialStatus.DISPUTA)
          .sort((a, b) => (a.deliveredAt ?? '').localeCompare(b.deliveredAt ?? ''))
          .map((s) => ({ ...this.shipmentRow(s, carrierName, labelOf), daysWaiting: s.deliveredAt ? Math.floor((Date.now() - new Date(s.deliveredAt).getTime()) / 86_400_000) : 0 }));
        return {
          ...base,
          columns: [...this.shipmentColumns(), { key: 'daysWaiting', label: 'Días esperando', type: 'number' }],
          rows,
          totals: this.shipmentTotals(rows),
        };
      }
      case 'settlements': {
        const settlements = (await this.repos.settlements.findAll()).filter((s) => inRange(s.date, from, to) && (!query.carrierId || s.carrierId === query.carrierId));
        const rows = settlements
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((s) => ({
            number: s.number,
            carrier: carrierName(s.carrierId),
            date: s.date,
            shipments: s.shipmentsCount,
            collected: s.totalCollected,
            amount: s.totalAmount,
            adjustment: s.adjustment,
            status: SETTLEMENT_STATUS_META[s.status].label,
            reference: s.reference ?? '',
          }));
        return {
          ...base,
          columns: [
            { key: 'number', label: 'Liquidación', type: 'text' },
            { key: 'carrier', label: 'Paquetería', type: 'text' },
            { key: 'date', label: 'Fecha', type: 'date' },
            { key: 'shipments', label: 'Paquetes', type: 'number' },
            { key: 'collected', label: 'Cobrado', type: 'currency' },
            { key: 'amount', label: 'Liquidado', type: 'currency' },
            { key: 'adjustment', label: 'Ajuste', type: 'currency' },
            { key: 'status', label: 'Estado', type: 'status' },
            { key: 'reference', label: 'Referencia', type: 'text' },
          ],
          rows,
          totals: {
            number: `${rows.length} liquidaciones`,
            shipments: rows.reduce((a, r) => a + r.shipments, 0),
            collected: sum(rows.map((r) => r.collected)),
            amount: sum(rows.map((r) => r.amount)),
            adjustment: sum(rows.map((r) => r.adjustment)),
          },
        };
      }
      case 'incidents': {
        const incidents = (await this.repos.incidents.findAll()).filter((i) => inRange(i.createdAt, from, to));
        const shipmentMap = new Map(shipments.map((s) => [s.id, s]));
        const rows = incidents
          .filter((i) => !query.carrierId || shipmentMap.get(i.shipmentId)?.carrierId === query.carrierId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((i) => {
            const s = shipmentMap.get(i.shipmentId);
            return {
              date: i.createdAt,
              tracking: s?.trackingNumber ?? i.shipmentId,
              customer: s?.customerName ?? '',
              carrier: s ? carrierName(s.carrierId) : '',
              type: INCIDENT_TYPE_LABELS[i.type],
              status: INCIDENT_STATUS_META[i.status].label,
              description: i.description,
              resolution: i.resolution ?? '',
            };
          });
        return {
          ...base,
          columns: [
            { key: 'date', label: 'Fecha', type: 'date' },
            { key: 'tracking', label: 'Tracking', type: 'text' },
            { key: 'customer', label: 'Cliente', type: 'text' },
            { key: 'carrier', label: 'Paquetería', type: 'text' },
            { key: 'type', label: 'Tipo', type: 'text' },
            { key: 'status', label: 'Estado', type: 'status' },
            { key: 'description', label: 'Descripción', type: 'text' },
            { key: 'resolution', label: 'Resolución', type: 'text' },
          ],
          rows,
          totals: { date: `${rows.length} incidencias` },
        };
      }
    }
  }

  private shipmentColumns(): ReportTable['columns'] {
    return [
      { key: 'tracking', label: 'Tracking', type: 'text' },
      { key: 'customer', label: 'Cliente', type: 'text' },
      { key: 'carrier', label: 'Paquetería', type: 'text' },
      { key: 'destination', label: 'Destino', type: 'text' },
      { key: 'deliveredAt', label: 'Entregado', type: 'date' },
      { key: 'amount', label: 'Monto', type: 'currency' },
      { key: 'financialStatus', label: 'Estado financiero', type: 'status' },
    ];
  }

  private shipmentRow(s: Shipment, carrierName: (id: string) => string, _labelOf: Map<string, string>) {
    return {
      tracking: s.trackingNumber,
      customer: s.customerName,
      carrier: carrierName(s.carrierId),
      destination: `${s.municipality}, ${s.department}`,
      deliveredAt: s.deliveredAt,
      amount: s.amountToCollect,
      financialStatus: FINANCIAL_STATUS_META[s.financialStatus].label,
    };
  }

  private shipmentTotals(rows: { amount: number }[]) {
    return { tracking: `${rows.length} paquetes`, amount: sum(rows.map((r) => r.amount)) };
  }
}

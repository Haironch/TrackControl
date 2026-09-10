import {
  FINANCIAL_STATUS_META,
  FinancialStatus,
  STATUS_CATEGORY_META,
  ShipmentStatusCode,
  StatusCategory,
  isReturnCategory,
  type ActivityItem,
  type DashboardStatistics,
  type DashboardSummary,
  type DailyPoint,
  type ShipmentStatusDefinition,
} from '@trackcontrol/shared';
import type { Repositories } from '../../core/persistence/data-source';
import { addDays, daysBetween, isSameDay, startOfDay, toDayKey, weekKey } from '../../core/utils/dates';
import { pct, round2, sum } from '../../core/utils/money';
import type { CarrierService } from '../carriers/carrier.service';
import type { StatusService } from '../statuses/status.service';
import type { UserService } from '../users/user.service';

const DAY_LABEL = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' });

export class DashboardService {
  constructor(
    private readonly repos: Repositories,
    private readonly statuses: StatusService,
    private readonly carriers: CarrierService,
    private readonly users: UserService,
  ) {}

  async summary(): Promise<DashboardSummary> {
    const [shipments, catalog, carrierMap, incidents] = await Promise.all([
      this.repos.shipments.findAll(),
      this.statuses.catalog(),
      this.carriers.refMap(),
      this.repos.incidents.findAll(),
    ]);
    const cat = categoryMap(catalog);
    const today = new Date();
    const of = (c: StatusCategory) => shipments.filter((s) => cat.get(s.status) === c);

    const delivered = of(StatusCategory.DELIVERED);
    const returning = of(StatusCategory.RETURNING);
    const returned = of(StatusCategory.RETURNED);
    const incident = of(StatusCategory.INCIDENT);
    const inTransit = of(StatusCategory.IN_TRANSIT);
    const pending = of(StatusCategory.PENDING);
    const porLiquidar = shipments.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR);
    const liquidado = shipments.filter((s) => s.financialStatus === FinancialStatus.LIQUIDADO || s.financialStatus === FinancialStatus.AJUSTE);
    const notClosed = [...pending, ...inTransit, ...incident];

    const byCarrier = [...carrierMap.values()].map((carrier) => {
      const own = shipments.filter((s) => s.carrierId === carrier.id);
      const d = own.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
      const r = own.filter((s) => isReturnCategory(cat.get(s.status)));
      return {
        carrier,
        total: own.length,
        delivered: d.length,
        pendingAmount: sum(own.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR).map((s) => s.amountToCollect)),
        deliveryRate: pct(d.length, d.length + r.length),
      };
    });

    return {
      counts: {
        total: shipments.length,
        sentToday: shipments.filter((s) => isSameDay(s.deliveredToCarrierAt ?? s.createdAt, today)).length,
        inTransit: inTransit.length,
        delivered: delivered.length,
        pendingDelivery: notClosed.length,
        rejected: shipments.filter((s) => s.status === ShipmentStatusCode.RECHAZADO).length,
        returning: returning.length,
        returned: returned.length,
        withIncidents: incident.length,
        pendingSettlement: porLiquidar.length,
      },
      financial: {
        totalSold: sum(shipments.filter((s) => cat.get(s.status) !== StatusCategory.RETURNED).map((s) => s.productValue)),
        totalDelivered: sum(delivered.map((s) => s.amountToCollect)),
        totalPendingCollection: sum(notClosed.map((s) => s.amountToCollect)),
        totalSettled: sum(liquidado.map((s) => s.amountToCollect)),
        pendingToReceive: sum(porLiquidar.map((s) => s.amountToCollect)),
        shippingCosts: sum(shipments.map((s) => s.shippingCost)),
        returnedValue: sum([...returning, ...returned].map((s) => s.productValue)),
        inDispute: sum(shipments.filter((s) => s.financialStatus === FinancialStatus.DISPUTA).map((s) => s.amountToCollect)),
      },
      today: {
        shipped: shipments.filter((s) => isSameDay(s.deliveredToCarrierAt, today)).length,
        delivered: shipments.filter((s) => isSameDay(s.deliveredAt, today)).length,
        returned: shipments.filter((s) => isSameDay(s.returnedAt, today)).length,
        incidents: incidents.filter((i) => isSameDay(i.createdAt, today)).length,
        collectedToday: sum(shipments.filter((s) => isSameDay(s.deliveredAt, today)).map((s) => s.amountToCollect)),
        pendingSettlementAmount: sum(porLiquidar.map((s) => s.amountToCollect)),
      },
      byCarrier: byCarrier.sort((a, b) => b.total - a.total),
    };
  }

  async statistics(rangeDays = 30): Promise<DashboardStatistics> {
    const [shipments, catalog, carrierMap] = await Promise.all([this.repos.shipments.findAll(), this.statuses.catalog(), this.carriers.refMap()]);
    const cat = categoryMap(catalog);
    const today = startOfDay(new Date());
    const start = addDays(today, -(rangeDays - 1));

    const daily: DailyPoint[] = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = addDays(start, i);
      const key = toDayKey(d);
      daily.push({
        date: key,
        label: DAY_LABEL.format(d),
        shipped: shipments.filter((s) => toDayKey(s.deliveredToCarrierAt ?? s.createdAt) === key).length,
        delivered: shipments.filter((s) => s.deliveredAt && toDayKey(s.deliveredAt) === key).length,
        returned: shipments.filter((s) => s.returnedAt && toDayKey(s.returnedAt) === key).length,
      });
    }

    const byStatus = catalog.map((def) => ({
      code: def.code,
      label: def.label,
      color: def.color,
      category: def.category,
      count: shipments.filter((s) => s.status === def.code).length,
    }));

    const byCategory = (Object.values(StatusCategory) as StatusCategory[]).map((category) => ({
      category,
      label: STATUS_CATEGORY_META[category].label,
      color: STATUS_CATEGORY_META[category].color,
      count: shipments.filter((s) => cat.get(s.status) === category).length,
    }));

    const delivered = shipments.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
    const returned = shipments.filter((s) => isReturnCategory(cat.get(s.status)));
    const inProgress = shipments.length - delivered.length - returned.length;

    // Ventas por semana (últimas 8 semanas)
    const weeks = new Map<string, { sold: number; delivered: number; settled: number }>();
    for (let i = 7; i >= 0; i--) {
      weeks.set(weekKey(addDays(today, -i * 7)), { sold: 0, delivered: 0, settled: 0 });
    }
    for (const s of shipments) {
      const wk = weekKey(s.createdAt);
      const bucket = weeks.get(wk);
      if (bucket && cat.get(s.status) !== StatusCategory.RETURNED) bucket.sold = round2(bucket.sold + s.productValue);
      if (s.deliveredAt) {
        const wd = weeks.get(weekKey(s.deliveredAt));
        if (wd) {
          wd.delivered = round2(wd.delivered + s.amountToCollect);
          if (s.financialStatus === FinancialStatus.LIQUIDADO || s.financialStatus === FinancialStatus.AJUSTE) wd.settled = round2(wd.settled + s.amountToCollect);
        }
      }
    }
    const salesByWeek = [...weeks.entries()].map(([week, v]) => ({ week, label: `Sem ${DAY_LABEL.format(new Date(`${week}T00:00:00`))}`, ...v }));

    const carrierPerformance = [...carrierMap.values()].map((carrier) => {
      const own = shipments.filter((s) => s.carrierId === carrier.id);
      const d = own.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
      const r = own.filter((s) => isReturnCategory(cat.get(s.status)));
      const t = own.filter((s) => cat.get(s.status) === StatusCategory.IN_TRANSIT);
      const durations = d.filter((s) => s.deliveredToCarrierAt && s.deliveredAt).map((s) => daysBetween(s.deliveredToCarrierAt!, s.deliveredAt!));
      return {
        carrier,
        total: own.length,
        delivered: d.length,
        returned: r.length,
        inTransit: t.length,
        deliveryRate: pct(d.length, d.length + r.length),
        avgDeliveryDays: durations.length ? round2(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        pendingAmount: sum(own.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR).map((s) => s.amountToCollect)),
      };
    }).sort((a, b) => b.total - a.total);

    const financialByStatus = (Object.values(FinancialStatus) as FinancialStatus[]).map((status) => {
      const own = shipments.filter((s) => s.financialStatus === status);
      return { status, label: FINANCIAL_STATUS_META[status].label, color: FINANCIAL_STATUS_META[status].color, count: own.length, amount: sum(own.map((s) => s.amountToCollect)) };
    });

    return {
      rangeDays,
      daily,
      byStatus,
      byCategory,
      successRate: { delivered: delivered.length, returned: returned.length, inProgress, rate: pct(delivered.length, delivered.length + returned.length) },
      salesByWeek,
      carrierPerformance,
      financialByStatus,
    };
  }

  async activity(limit = 12): Promise<ActivityItem[]> {
    const history = await this.repos.history.findAll();
    const recent = history.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
    return Promise.all(
      recent.map(async (h) => {
        const s = await this.repos.shipments.findById(h.shipmentId);
        return { ...h, user: await this.users.ref(h.userId), shipment: s ? { id: s.id, trackingNumber: s.trackingNumber, customerName: s.customerName } : null };
      }),
    );
  }
}

function categoryMap(catalog: ShipmentStatusDefinition[]) {
  return new Map(catalog.map((s) => [s.code, s.category]));
}

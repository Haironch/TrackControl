import {
  FinancialStatus,
  HistoryEntryType,
  SettlementStatus,
  type CreateSettlementDto,
  type Payment,
  type Settlement,
  type SettlementDetail,
  type SettlementView,
  type ShipmentView,
  type User,
} from '@trackcontrol/shared';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { newId, padNumber } from '../../core/utils/ids';
import { nowIso } from '../../core/utils/dates';
import { round2, sum } from '../../core/utils/money';
import type { CarrierService } from '../carriers/carrier.service';
import type { ShipmentService } from '../shipments/shipment.service';
import type { UserService } from '../users/user.service';

export class SettlementService {
  constructor(
    private readonly repos: Repositories,
    private readonly shipments: ShipmentService,
    private readonly carriers: CarrierService,
    private readonly users: UserService,
  ) {}

  async list(filter: { carrierId?: string; status?: SettlementStatus } = {}): Promise<SettlementView[]> {
    const items = await this.repos.settlements.findMany(
      (s) => (!filter.carrierId || s.carrierId === filter.carrierId) && (!filter.status || s.status === filter.status),
    );
    const views = await Promise.all(items.map((s) => this.toView(s)));
    return views.sort((a, b) => b.date.localeCompare(a.date));
  }

  async get(id: string): Promise<SettlementView> {
    const s = await this.repos.settlements.findById(id);
    if (!s) throw new NotFoundError('Liquidación', id);
    return this.toView(s);
  }

  /** Envíos entregados y pendientes de liquidar de una paquetería (candidatos a liquidación). */
  async pendingShipments(carrierId?: string): Promise<ShipmentView[]> {
    const items = await this.repos.shipments.findMany(
      (s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR && (!carrierId || s.carrierId === carrierId),
    );
    const views = await this.shipments.enrichMany(items);
    return views.sort((a, b) => (a.deliveredAt ?? '').localeCompare(b.deliveredAt ?? ''));
  }

  /** Resumen de dinero por paquetería: cobrado, liquidado y pendiente. */
  async summaryByCarrier() {
    const carriers = await this.carriers.list();
    return carriers.map((c) => ({
      carrier: { id: c.id, name: c.name, color: c.color },
      delivered: c.stats.delivered,
      collected: c.stats.collected,
      settled: c.stats.settled,
      pending: c.stats.pending,
    }));
  }

  async create(dto: CreateSettlementDto, actor: User): Promise<SettlementView> {
    const carrier = await this.repos.carriers.findById(dto.carrierId);
    if (!carrier) throw new ValidationError('La paquetería no existe.', { field: 'carrierId' });
    if (!dto.shipmentIds.length) throw new ValidationError('Selecciona al menos un envío.', { field: 'shipmentIds' });

    const shipments = await this.repos.shipments.findMany((s) => dto.shipmentIds.includes(s.id));
    if (shipments.length !== dto.shipmentIds.length) throw new ValidationError('Uno o más envíos no existen.');
    const invalid = shipments.filter((s) => s.carrierId !== dto.carrierId || s.financialStatus !== FinancialStatus.POR_LIQUIDAR);
    if (invalid.length) {
      throw new BusinessRuleError('Solo se pueden liquidar envíos entregados, pendientes de liquidar y de la misma paquetería.', {
        invalid: invalid.map((s) => s.trackingNumber),
      });
    }

    const totalCollected = sum(shipments.map((s) => s.amountToCollect));
    const totalAmount = dto.totalAmount !== undefined && dto.totalAmount !== null ? round2(dto.totalAmount) : totalCollected;
    const adjustment = round2(totalAmount - totalCollected);
    const now = nowIso();
    const confirm = dto.confirm ?? true;

    const settlement: Settlement = {
      id: newId('stl'),
      number: await this.nextNumber(),
      carrierId: dto.carrierId,
      date: dto.date,
      status: confirm ? SettlementStatus.CONFIRMADA : SettlementStatus.PENDIENTE,
      shipmentsCount: shipments.length,
      totalCollected,
      totalAmount,
      adjustment,
      reference: dto.reference ?? null,
      notes: dto.notes ?? null,
      createdByUserId: actor.id,
      confirmedAt: confirm ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repos.settlements.create(settlement);

    // Distribuir el ajuste proporcionalmente entre los envíos
    const details: SettlementDetail[] = shipments.map((s) => {
      const share = totalCollected > 0 ? round2((s.amountToCollect / totalCollected) * adjustment) : 0;
      return {
        id: newId('std'),
        settlementId: settlement.id,
        shipmentId: s.id,
        amountCollected: s.amountToCollect,
        amountSettled: round2(s.amountToCollect + share),
        adjustment: share,
        note: null,
      };
    });
    await this.repos.settlementDetails.createMany(details);

    if (dto.payment) {
      const payment: Payment = {
        id: newId('pay'),
        settlementId: settlement.id,
        method: dto.payment.method,
        reference: dto.payment.reference ?? null,
        bankName: dto.payment.bankName ?? null,
        amount: totalAmount,
        paidAt: dto.date,
        createdAt: now,
        updatedAt: now,
      };
      await this.repos.payments.create(payment);
    }

    for (const s of shipments) {
      if (confirm) {
        await this.shipments.setFinancialStatus(
          s.id,
          adjustment !== 0 ? FinancialStatus.AJUSTE : FinancialStatus.LIQUIDADO,
          actor,
          `Liquidado en ${settlement.number}${adjustment !== 0 ? ' con ajuste' : ''}`,
          { settlementId: settlement.id },
        );
      } else {
        await this.repos.shipments.update(s.id, { settlementId: settlement.id, updatedAt: now });
        await this.shipments.addHistory({
          shipmentId: s.id,
          type: HistoryEntryType.SETTLEMENT,
          fromStatus: null,
          toStatus: null,
          occurredAt: now,
          userId: actor.id,
          comment: `Incluido en liquidación ${settlement.number} (pendiente de confirmar)`,
          metadata: { settlementId: settlement.id },
        });
      }
    }
    return this.toView(settlement);
  }

  async confirm(id: string, actor: User): Promise<SettlementView> {
    const settlement = await this.repos.settlements.findById(id);
    if (!settlement) throw new NotFoundError('Liquidación', id);
    if (settlement.status !== SettlementStatus.PENDIENTE) throw new BusinessRuleError('Solo se pueden confirmar liquidaciones pendientes.');
    const now = nowIso();
    const details = await this.repos.settlementDetails.findMany((d) => d.settlementId === id);
    for (const d of details) {
      await this.shipments.setFinancialStatus(
        d.shipmentId,
        settlement.adjustment !== 0 ? FinancialStatus.AJUSTE : FinancialStatus.LIQUIDADO,
        actor,
        `Liquidación ${settlement.number} confirmada`,
        { settlementId: id },
      );
    }
    const updated = await this.repos.settlements.update(id, { status: SettlementStatus.CONFIRMADA, confirmedAt: now, updatedAt: now });
    return this.toView(updated);
  }

  async cancel(id: string, actor: User): Promise<SettlementView> {
    const settlement = await this.repos.settlements.findById(id);
    if (!settlement) throw new NotFoundError('Liquidación', id);
    if (settlement.status === SettlementStatus.ANULADA) throw new BusinessRuleError('La liquidación ya está anulada.');
    const details = await this.repos.settlementDetails.findMany((d) => d.settlementId === id);
    for (const d of details) {
      await this.shipments.setFinancialStatus(d.shipmentId, FinancialStatus.POR_LIQUIDAR, actor, `Liquidación ${settlement.number} anulada`, { settlementId: null });
    }
    const updated = await this.repos.settlements.update(id, { status: SettlementStatus.ANULADA, updatedAt: nowIso() });
    return this.toView(updated);
  }

  private async nextNumber() {
    const all = await this.repos.settlements.findAll();
    const max = all.reduce((m, s) => {
      const match = /LQ-(\d+)$/.exec(s.number);
      return match ? Math.max(m, Number(match[1])) : m;
    }, 0);
    return `LQ-${padNumber(max + 1)}`;
  }

  private async toView(s: Settlement): Promise<SettlementView> {
    const details = await this.repos.settlementDetails.findMany((d) => d.settlementId === s.id);
    const payments = await this.repos.payments.findMany((p) => p.settlementId === s.id);
    const detailViews = await Promise.all(
      details.map(async (d) => {
        const sh = await this.repos.shipments.findById(d.shipmentId);
        return { ...d, shipment: sh ? { id: sh.id, trackingNumber: sh.trackingNumber, customerName: sh.customerName, deliveredAt: sh.deliveredAt } : null };
      }),
    );
    return {
      ...s,
      carrier: await this.carriers.ref(s.carrierId),
      createdBy: await this.users.ref(s.createdByUserId),
      details: detailViews,
      payments,
    };
  }
}

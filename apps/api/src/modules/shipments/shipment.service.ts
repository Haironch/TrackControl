import {
  FinancialStatus,
  HistoryEntryType,
  PaymentType,
  ShipmentStatusCode,
  StatusCategory,
  UserRole,
  type ChangeStatusDto,
  type CreateShipmentDto,
  type Paginated,
  type Shipment,
  type ShipmentDetailView,
  type ShipmentHistory,
  type ShipmentHistoryView,
  type ShipmentProduct,
  type ShipmentQuery,
  type ShipmentView,
  type UpdateShipmentDto,
  type User,
} from '@trackcontrol/shared';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { newId, padNumber } from '../../core/utils/ids';
import { inRange, nowIso, parseDateParam } from '../../core/utils/dates';
import { round2 } from '../../core/utils/money';
import type { CarrierService } from '../carriers/carrier.service';
import type { CustomerService } from '../customers/customer.service';
import type { StatusService } from '../statuses/status.service';
import type { UserService } from '../users/user.service';

interface ChangeStatusOptions extends ChangeStatusDto {
  force?: boolean;
}

export class ShipmentService {
  constructor(
    private readonly repos: Repositories,
    private readonly statuses: StatusService,
    private readonly carriers: CarrierService,
    private readonly customers: CustomerService,
    private readonly users: UserService,
  ) {}

  // ---------------- Consultas ----------------

  async list(query: ShipmentQuery): Promise<Paginated<ShipmentView>> {
    const catalog = await this.statuses.catalog();
    const categoryOf = new Map(catalog.map((s) => [s.code, s.category]));
    const from = parseDateParam(query.from);
    const to = parseDateParam(query.to, true);
    const q = query.search?.trim().toLowerCase();

    let items = await this.repos.shipments.findMany((s) => {
      if (query.status && s.status !== query.status) return false;
      if (query.category && categoryOf.get(s.status) !== query.category) return false;
      if (query.carrierId && s.carrierId !== query.carrierId) return false;
      if (query.customerId && s.customerId !== query.customerId) return false;
      if (query.department && s.department !== query.department) return false;
      if (query.financialStatus && s.financialStatus !== query.financialStatus) return false;
      if (query.paymentType && s.paymentType !== query.paymentType) return false;
      if ((from || to) && !inRange(s.createdAt, from, to)) return false;
      if (q) {
        const haystack = [s.trackingNumber, s.carrierGuideNumber ?? '', s.customerName, s.customerPhone, s.municipality, s.description]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const dir = query.sortDir === 'asc' ? 1 : -1;
    const key = query.sortBy ?? 'createdAt';
    items = items.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[key] ?? '';
      const bv = (b as unknown as Record<string, unknown>)[key] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'es') * dir;
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = items.length;
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    const data = await this.enrichMany(slice);
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async facets() {
    const shipments = await this.repos.shipments.findAll();
    const departments = new Map<string, number>();
    for (const s of shipments) departments.set(s.department, (departments.get(s.department) ?? 0) + 1);
    return {
      departments: [...departments.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    };
  }

  async getDetail(id: string): Promise<ShipmentDetailView> {
    const shipment = await this.repos.shipments.findById(id);
    if (!shipment) throw new NotFoundError('Envío', id);
    const [view] = await this.enrichMany([shipment]);
    const history = await this.history(id);
    const incidents = await this.repos.incidents.findMany((i) => i.shipmentId === id);
    const incidentViews = await Promise.all(
      incidents.map(async (i) => ({
        ...i,
        shipment: { id: shipment.id, trackingNumber: shipment.trackingNumber, customerName: shipment.customerName, carrierId: shipment.carrierId },
        reportedBy: await this.users.ref(i.reportedByUserId),
        assignedTo: await this.users.ref(i.assignedUserId),
      })),
    );
    const settlement = shipment.settlementId ? await this.repos.settlements.findById(shipment.settlementId) : null;
    return { ...view, history, incidents: incidentViews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), settlement };
  }

  async findByTracking(tracking: string) {
    const t = tracking.trim().toLowerCase();
    const s = await this.repos.shipments.findOne((x) => x.trackingNumber.toLowerCase() === t || (x.carrierGuideNumber ?? '').toLowerCase() === t);
    if (!s) throw new NotFoundError('Envío con tracking', tracking);
    return this.getDetail(s.id);
  }

  async history(id: string): Promise<ShipmentHistoryView[]> {
    const entries = await this.repos.history.findMany((h) => h.shipmentId === id);
    const views = await Promise.all(entries.map(async (h) => ({ ...h, user: await this.users.ref(h.userId) })));
    return views.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  // ---------------- Comandos ----------------

  async create(dto: CreateShipmentDto, actor: User): Promise<ShipmentView> {
    const carrier = await this.repos.carriers.findById(dto.carrierId);
    if (!carrier) throw new ValidationError('La paquetería seleccionada no existe.', { field: 'carrierId' });
    if (!carrier.active) throw new BusinessRuleError(`La paquetería ${carrier.name} está inactiva.`);

    const customer = await this.customers.findOrCreateFromShipment({
      customerId: dto.customerId,
      name: dto.customerName,
      phone: dto.customerPhone,
      address: dto.address,
      department: dto.department,
      municipality: dto.municipality,
    });

    const now = nowIso();
    const id = newId('shp');
    const products = this.buildProducts(id, dto.products ?? []);
    const itemsCount = products.length ? products.reduce((a, p) => a + p.quantity, 0) : (dto.itemsCount ?? 1);
    const productValue = products.length ? round2(products.reduce((a, p) => a + p.quantity * p.unitPrice, 0)) : dto.productValue;
    const amountToCollect = dto.paymentType === PaymentType.CONTRA_ENTREGA ? dto.amountToCollect : 0;

    const shipment: Shipment = {
      id,
      trackingNumber: await this.nextTrackingNumber(),
      carrierGuideNumber: dto.carrierGuideNumber ?? null,
      carrierId: carrier.id,
      customerId: customer.id,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      address: dto.address,
      department: dto.department,
      municipality: dto.municipality,
      description: dto.description,
      itemsCount,
      productValue,
      amountToCollect,
      shippingCost: dto.shippingCost,
      paymentType: dto.paymentType,
      status: ShipmentStatusCode.NUEVO,
      financialStatus: amountToCollect > 0 ? FinancialStatus.PENDIENTE : FinancialStatus.NO_APLICA,
      assignedUserId: dto.assignedUserId ?? actor.id,
      notes: dto.notes ?? null,
      deliveredToCarrierAt: null,
      estimatedDeliveryAt: dto.estimatedDeliveryAt ?? null,
      deliveredAt: null,
      returnedAt: null,
      settlementId: null,
      products,
      coordinates: null,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.repos.shipments.create(shipment);
    await this.addHistory({
      shipmentId: id,
      type: HistoryEntryType.STATUS,
      fromStatus: null,
      toStatus: ShipmentStatusCode.NUEVO,
      occurredAt: now,
      userId: actor.id,
      comment: 'Envío creado',
    });
    const [view] = await this.enrichMany([shipment]);
    return view;
  }

  async update(id: string, dto: UpdateShipmentDto, actor: User): Promise<ShipmentView> {
    const existing = await this.repos.shipments.findById(id);
    if (!existing) throw new NotFoundError('Envío', id);
    if (dto.carrierId && dto.carrierId !== existing.carrierId) {
      const carrier = await this.repos.carriers.findById(dto.carrierId);
      if (!carrier) throw new ValidationError('La paquetería seleccionada no existe.', { field: 'carrierId' });
    }
    const patch: Partial<Shipment> = { ...dto, updatedAt: nowIso() } as Partial<Shipment>;
    delete (patch as Record<string, unknown>).customerId;
    if (dto.products) {
      patch.products = this.buildProducts(id, dto.products);
      patch.itemsCount = patch.products.reduce((a, p) => a + p.quantity, 0);
      patch.productValue = round2(patch.products.reduce((a, p) => a + p.quantity * p.unitPrice, 0));
    }
    const paymentType = dto.paymentType ?? existing.paymentType;
    const amountToCollect = dto.amountToCollect ?? existing.amountToCollect;
    patch.amountToCollect = paymentType === PaymentType.CONTRA_ENTREGA ? amountToCollect : 0;
    if (existing.financialStatus === FinancialStatus.PENDIENTE || existing.financialStatus === FinancialStatus.NO_APLICA) {
      patch.financialStatus = patch.amountToCollect > 0 ? FinancialStatus.PENDIENTE : FinancialStatus.NO_APLICA;
    }
    const updated = await this.repos.shipments.update(id, patch);
    await this.addHistory({
      shipmentId: id,
      type: HistoryEntryType.EDIT,
      fromStatus: null,
      toStatus: null,
      occurredAt: nowIso(),
      userId: actor.id,
      comment: 'Datos del envío actualizados',
      metadata: { fields: Object.keys(dto) },
    });
    const [view] = await this.enrichMany([updated]);
    return view;
  }

  async changeStatus(id: string, dto: ChangeStatusOptions, actor: User): Promise<ShipmentDetailView> {
    const shipment = await this.repos.shipments.findById(id);
    if (!shipment) throw new NotFoundError('Envío', id);
    const target = await this.statuses.get(dto.status);
    if (!target) throw new ValidationError(`El estado "${dto.status}" no existe.`, { field: 'status' });
    if (shipment.status === dto.status) throw new BusinessRuleError(`El envío ya está en estado ${target.label}.`);

    const allowed = await this.statuses.isTransitionAllowed(shipment.status, dto.status);
    const canForce = dto.force && actor.role === UserRole.ADMINISTRADOR;
    if (!allowed && !canForce) {
      const current = await this.statuses.get(shipment.status);
      throw new BusinessRuleError(`No se puede pasar de "${current?.label ?? shipment.status}" a "${target.label}".`, {
        allowed: current?.nextStatuses ?? [],
      });
    }

    const occurredAt = dto.occurredAt ?? nowIso();
    const patch: Partial<Shipment> = { status: dto.status, updatedAt: nowIso() };
    if (dto.carrierGuideNumber) patch.carrierGuideNumber = dto.carrierGuideNumber;

    // Efectos colaterales por estado
    if (dto.status === ShipmentStatusCode.ENTREGADO_A_PAQUETERIA && !shipment.deliveredToCarrierAt) patch.deliveredToCarrierAt = occurredAt;
    if (dto.status === ShipmentStatusCode.ENTREGADO) patch.deliveredAt = occurredAt;
    if (dto.status === ShipmentStatusCode.RECIBIDO_EN_BODEGA) patch.returnedAt = occurredAt;

    await this.repos.shipments.update(id, patch);
    await this.addHistory({
      shipmentId: id,
      type: HistoryEntryType.STATUS,
      fromStatus: shipment.status,
      toStatus: dto.status,
      occurredAt,
      userId: actor.id,
      comment: dto.comment ?? null,
      metadata: canForce && !allowed ? { forced: true } : null,
    });

    await this.applyFinancialEffects({ ...shipment, ...patch }, dto.status, occurredAt, actor);
    return this.getDetail(id);
  }

  async addNote(id: string, comment: string, actor: User) {
    const shipment = await this.repos.shipments.findById(id);
    if (!shipment) throw new NotFoundError('Envío', id);
    await this.addHistory({ shipmentId: id, type: HistoryEntryType.NOTE, fromStatus: null, toStatus: null, occurredAt: nowIso(), userId: actor.id, comment });
    await this.repos.shipments.update(id, { updatedAt: nowIso() });
    return this.history(id);
  }

  /** Cambia el estado financiero y registra el movimiento. Usado por liquidaciones e incidencias. */
  async setFinancialStatus(id: string, status: FinancialStatus, actor: User | null, comment: string, extra: Partial<Shipment> = {}) {
    const shipment = await this.repos.shipments.findById(id);
    if (!shipment) throw new NotFoundError('Envío', id);
    if (shipment.financialStatus === status && !Object.keys(extra).length) return shipment;
    const updated = await this.repos.shipments.update(id, { financialStatus: status, updatedAt: nowIso(), ...extra });
    await this.addHistory({
      shipmentId: id,
      type: HistoryEntryType.FINANCIAL,
      fromStatus: shipment.financialStatus,
      toStatus: status,
      occurredAt: nowIso(),
      userId: actor?.id ?? null,
      comment,
    });
    return updated;
  }

  async addHistory(entry: Omit<ShipmentHistory, 'id'>) {
    return this.repos.history.create({ id: newId('hist'), ...entry });
  }

  // ---------------- Helpers ----------------

  private async applyFinancialEffects(shipment: Shipment, newStatus: string, occurredAt: string, actor: User) {
    if (newStatus === ShipmentStatusCode.ENTREGADO) {
      if (shipment.paymentType === PaymentType.CONTRA_ENTREGA && shipment.amountToCollect > 0) {
        if (shipment.financialStatus === FinancialStatus.PENDIENTE || shipment.financialStatus === FinancialStatus.NO_APLICA) {
          await this.setFinancialStatus(
            shipment.id,
            FinancialStatus.POR_LIQUIDAR,
            actor,
            `Entregado: Q${shipment.amountToCollect.toFixed(2)} pendientes de recibir de la paquetería`,
          );
        }
      } else if (shipment.financialStatus === FinancialStatus.PENDIENTE) {
        await this.setFinancialStatus(shipment.id, FinancialStatus.NO_APLICA, actor, 'Entregado sin cobro contra entrega');
      }
      return;
    }
    if (newStatus === ShipmentStatusCode.RECIBIDO_EN_BODEGA || newStatus === ShipmentStatusCode.RECHAZADO || newStatus === ShipmentStatusCode.EN_RETORNO) {
      if (shipment.financialStatus === FinancialStatus.PENDIENTE) {
        await this.setFinancialStatus(shipment.id, FinancialStatus.NO_APLICA, actor, 'Paquete en retorno: no hay cobro que liquidar');
      }
    }
  }

  private buildProducts(shipmentId: string, inputs: NonNullable<CreateShipmentDto['products']>): ShipmentProduct[] {
    return inputs.map((p) => ({
      id: newId('sp'),
      shipmentId,
      productId: p.productId ?? null,
      name: p.name,
      quantity: p.quantity,
      unitPrice: round2(p.unitPrice),
    }));
  }

  private async nextTrackingNumber() {
    const year = String(new Date().getFullYear()).slice(-2);
    const all = await this.repos.shipments.findAll();
    const max = all.reduce((m, s) => {
      const match = /TC-\d{2}-(\d+)$/.exec(s.trackingNumber);
      return match ? Math.max(m, Number(match[1])) : m;
    }, 0);
    return `TC-${year}-${padNumber(max + 1)}`;
  }

  async enrichMany(shipments: Shipment[]): Promise<ShipmentView[]> {
    const [catalog, carrierMap, users] = await Promise.all([this.statuses.catalog(), this.carriers.refMap(), this.repos.users.findAll()]);
    const statusMap = new Map(catalog.map((s) => [s.code, s]));
    const userMap = new Map(users.map((u) => [u.id, { id: u.id, name: u.name, role: u.role }]));
    const fallbackStatus = catalog[0];
    return shipments.map((s) => ({
      ...s,
      carrier: carrierMap.get(s.carrierId) ?? { id: s.carrierId, name: 'Desconocida', color: '#94a3b8' },
      assignedUser: s.assignedUserId ? (userMap.get(s.assignedUserId) ?? null) : null,
      statusDefinition: statusMap.get(s.status) ?? { ...fallbackStatus, code: s.status, label: s.status, category: StatusCategory.PENDING },
    }));
  }
}

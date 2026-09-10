import {
  FinancialStatus,
  StatusCategory,
  isReturnCategory,
  isSettled,
  type Carrier,
  type CarrierRef,
  type CarrierView,
  type CreateCarrierDto,
  type UpdateCarrierDto,
} from '@trackcontrol/shared';
import { ConflictError, NotFoundError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { newId } from '../../core/utils/ids';
import { nowIso } from '../../core/utils/dates';
import { pct, sum } from '../../core/utils/money';
import type { StatusService } from '../statuses/status.service';

export class CarrierService {
  constructor(
    private readonly repos: Repositories,
    private readonly statuses: StatusService,
  ) {}

  async list(): Promise<CarrierView[]> {
    const carriers = await this.repos.carriers.findAll();
    const views = await Promise.all(carriers.map((c) => this.withStats(c)));
    return views.sort((a, b) => b.stats.totalShipments - a.stats.totalShipments);
  }

  async get(id: string): Promise<CarrierView> {
    const carrier = await this.repos.carriers.findById(id);
    if (!carrier) throw new NotFoundError('Paquetería', id);
    return this.withStats(carrier);
  }

  async ref(id: string): Promise<CarrierRef> {
    const c = await this.repos.carriers.findById(id);
    return c ? { id: c.id, name: c.name, color: c.color } : { id, name: 'Desconocida', color: '#94a3b8' };
  }

  async refMap(): Promise<Map<string, CarrierRef>> {
    const all = await this.repos.carriers.findAll();
    return new Map(all.map((c) => [c.id, { id: c.id, name: c.name, color: c.color }]));
  }

  async create(dto: CreateCarrierDto): Promise<CarrierView> {
    const dup = await this.repos.carriers.findOne((c) => c.name.toLowerCase() === dto.name.toLowerCase());
    if (dup) throw new ConflictError(`Ya existe una paquetería llamada "${dto.name}".`);
    const now = nowIso();
    const carrier: Carrier = {
      id: newId('car'),
      name: dto.name,
      code: dto.code ?? dto.name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase(),
      phone: dto.phone,
      contactName: dto.contactName,
      email: dto.email ?? null,
      active: dto.active ?? true,
      color: dto.color,
      integration: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repos.carriers.create(carrier);
    return this.withStats(carrier);
  }

  async update(id: string, dto: UpdateCarrierDto): Promise<CarrierView> {
    const existing = await this.repos.carriers.findById(id);
    if (!existing) throw new NotFoundError('Paquetería', id);
    const updated = await this.repos.carriers.update(id, { ...dto, updatedAt: nowIso() } as Partial<Carrier>);
    return this.withStats(updated);
  }

  async toggleActive(id: string) {
    const existing = await this.repos.carriers.findById(id);
    if (!existing) throw new NotFoundError('Paquetería', id);
    const updated = await this.repos.carriers.update(id, { active: !existing.active, updatedAt: nowIso() });
    return this.withStats(updated);
  }

  private async withStats(carrier: Carrier): Promise<CarrierView> {
    const catalog = await this.statuses.catalog();
    const cat = new Map(catalog.map((s) => [s.code, s.category]));
    const shipments = await this.repos.shipments.findMany((s) => s.carrierId === carrier.id);
    const delivered = shipments.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
    const returned = shipments.filter((s) => isReturnCategory(cat.get(s.status)));
    const inTransit = shipments.filter((s) => cat.get(s.status) === StatusCategory.IN_TRANSIT);
    const finished = delivered.length + returned.length;
    return {
      ...carrier,
      stats: {
        totalShipments: shipments.length,
        delivered: delivered.length,
        returned: returned.length,
        inTransit: inTransit.length,
        deliveryRate: pct(delivered.length, finished),
        collected: sum(delivered.map((s) => s.amountToCollect)),
        settled: sum(delivered.filter((s) => isSettled(s.financialStatus)).map((s) => s.amountToCollect)),
        pending: sum(delivered.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR).map((s) => s.amountToCollect)),
      },
    };
  }
}

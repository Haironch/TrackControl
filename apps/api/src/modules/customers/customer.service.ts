import {
  StatusCategory,
  isReturnCategory,
  type CreateCustomerDto,
  type Customer,
  type CustomerView,
  type UpdateCustomerDto,
} from '@trackcontrol/shared';
import { NotFoundError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { newId } from '../../core/utils/ids';
import { nowIso } from '../../core/utils/dates';
import { sum } from '../../core/utils/money';
import type { StatusService } from '../statuses/status.service';

export class CustomerService {
  constructor(
    private readonly repos: Repositories,
    private readonly statuses: StatusService,
  ) {}

  async list(search?: string): Promise<CustomerView[]> {
    let customers = await this.repos.customers.findAll();
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.municipality.toLowerCase().includes(q) || c.department.toLowerCase().includes(q),
      );
    }
    const views = await Promise.all(customers.map((c) => this.withStats(c)));
    return views.sort((a, b) => b.stats.orders - a.stats.orders);
  }

  async get(id: string): Promise<CustomerView> {
    const c = await this.repos.customers.findById(id);
    if (!c) throw new NotFoundError('Cliente', id);
    return this.withStats(c);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerView> {
    const now = nowIso();
    const customer: Customer = { id: newId('cus'), ...dto, email: dto.email ?? null, notes: dto.notes ?? null, createdAt: now, updatedAt: now };
    await this.repos.customers.create(customer);
    return this.withStats(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerView> {
    const existing = await this.repos.customers.findById(id);
    if (!existing) throw new NotFoundError('Cliente', id);
    const updated = await this.repos.customers.update(id, { ...dto, updatedAt: nowIso() } as Partial<Customer>);
    return this.withStats(updated);
  }

  /** Busca un cliente por teléfono o lo crea a partir de los datos del envío. */
  async findOrCreateFromShipment(input: { customerId?: string | null; name: string; phone: string; address: string; department: string; municipality: string }) {
    if (input.customerId) {
      const found = await this.repos.customers.findById(input.customerId);
      if (found) return found;
    }
    const byPhone = await this.repos.customers.findOne((c) => c.phone.replace(/\D/g, '') === input.phone.replace(/\D/g, ''));
    if (byPhone) return byPhone;
    const now = nowIso();
    const customer: Customer = {
      id: newId('cus'),
      name: input.name,
      phone: input.phone,
      address: input.address,
      department: input.department,
      municipality: input.municipality,
      email: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.repos.customers.create(customer);
  }

  private async withStats(customer: Customer): Promise<CustomerView> {
    const catalog = await this.statuses.catalog();
    const cat = new Map(catalog.map((s) => [s.code, s.category]));
    const shipments = await this.repos.shipments.findMany((s) => s.customerId === customer.id);
    const delivered = shipments.filter((s) => cat.get(s.status) === StatusCategory.DELIVERED);
    const rejected = shipments.filter((s) => isReturnCategory(cat.get(s.status)));
    const last = shipments.map((s) => s.createdAt).sort().at(-1) ?? null;
    return {
      ...customer,
      stats: {
        orders: shipments.length,
        delivered: delivered.length,
        rejected: rejected.length,
        totalSpent: sum(delivered.map((s) => s.productValue)),
        lastOrderAt: last,
      },
    };
  }
}

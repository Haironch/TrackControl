import { DEFAULT_SHIPMENT_STATUSES, type ShipmentStatusDefinition } from '@trackcontrol/shared';
import type { Repositories } from '../../core/persistence/data-source';

/** Catálogo configurable de estados. Se carga desde el repositorio; si está vacío usa el default. */
export class StatusService {
  constructor(private readonly repos: Repositories) {}

  async catalog(): Promise<ShipmentStatusDefinition[]> {
    const stored = await this.repos.statuses.findAll();
    const list = stored.length ? stored : DEFAULT_SHIPMENT_STATUSES;
    return [...list].sort((a, b) => a.order - b.order);
  }

  async get(code: string): Promise<ShipmentStatusDefinition | null> {
    const list = await this.catalog();
    return list.find((s) => s.code === code) ?? null;
  }

  async isTransitionAllowed(from: string, to: string) {
    const def = await this.get(from);
    return def ? def.nextStatuses.includes(to) : false;
  }
}

import {
  FinancialStatus,
  HistoryEntryType,
  IncidentStatus,
  IncidentType,
  ShipmentStatusCode,
  type CreateIncidentDto,
  type IncidentView,
  type ShipmentIncident,
  type UpdateIncidentDto,
  type User,
} from '@trackcontrol/shared';
import { NotFoundError, ValidationError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';
import { newId } from '../../core/utils/ids';
import { nowIso } from '../../core/utils/dates';
import type { ShipmentService } from '../shipments/shipment.service';
import type { UserService } from '../users/user.service';

export class IncidentService {
  constructor(
    private readonly repos: Repositories,
    private readonly shipments: ShipmentService,
    private readonly users: UserService,
  ) {}

  async list(filter: { status?: IncidentStatus; type?: IncidentType; shipmentId?: string } = {}): Promise<IncidentView[]> {
    const items = await this.repos.incidents.findMany(
      (i) => (!filter.status || i.status === filter.status) && (!filter.type || i.type === filter.type) && (!filter.shipmentId || i.shipmentId === filter.shipmentId),
    );
    const views = await Promise.all(items.map((i) => this.toView(i)));
    return views.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<IncidentView> {
    const incident = await this.repos.incidents.findById(id);
    if (!incident) throw new NotFoundError('Incidencia', id);
    return this.toView(incident);
  }

  async create(dto: CreateIncidentDto, actor: User): Promise<IncidentView> {
    const shipment = await this.repos.shipments.findById(dto.shipmentId);
    if (!shipment) throw new ValidationError('El envío indicado no existe.', { field: 'shipmentId' });
    const now = nowIso();
    const incident: ShipmentIncident = {
      id: newId('inc'),
      shipmentId: dto.shipmentId,
      type: dto.type,
      description: dto.description,
      status: IncidentStatus.ABIERTA,
      reportedByUserId: actor.id,
      assignedUserId: dto.assignedUserId ?? null,
      resolution: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repos.incidents.create(incident);
    await this.shipments.addHistory({
      shipmentId: shipment.id,
      type: HistoryEntryType.INCIDENT,
      fromStatus: null,
      toStatus: null,
      occurredAt: now,
      userId: actor.id,
      comment: `Incidencia registrada: ${dto.description}`,
      metadata: { incidentId: incident.id, incidentType: dto.type },
    });

    // Mover el envío a INCIDENCIA (salvo que ya esté cerrado en bodega o ya sea incidencia)
    const shouldMove = dto.moveShipmentToIncident ?? true;
    const untouched = [ShipmentStatusCode.INCIDENCIA, ShipmentStatusCode.EN_ESPERA, ShipmentStatusCode.RECIBIDO_EN_BODEGA] as string[];
    if (shouldMove && !untouched.includes(shipment.status)) {
      await this.shipments.changeStatus(shipment.id, { status: ShipmentStatusCode.INCIDENCIA, comment: `Por incidencia ${incident.id}`, force: true }, { ...actor, role: 'ADMINISTRADOR' });
    }
    // Pago incorrecto sobre un paquete ya entregado → disputa financiera
    if (dto.type === IncidentType.PAGO_INCORRECTO && shipment.financialStatus === FinancialStatus.POR_LIQUIDAR) {
      await this.shipments.setFinancialStatus(shipment.id, FinancialStatus.DISPUTA, actor, 'Disputa por pago incorrecto');
    }
    return this.toView(incident);
  }

  async update(id: string, dto: UpdateIncidentDto, actor: User): Promise<IncidentView> {
    const incident = await this.repos.incidents.findById(id);
    if (!incident) throw new NotFoundError('Incidencia', id);
    const patch: Partial<ShipmentIncident> = { updatedAt: nowIso() };
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.assignedUserId !== undefined) patch.assignedUserId = dto.assignedUserId;
    if (dto.resolution !== undefined) patch.resolution = dto.resolution;
    if (dto.status && dto.status !== incident.status) {
      patch.status = dto.status;
      patch.resolvedAt = dto.status === IncidentStatus.RESUELTA ? nowIso() : null;
      await this.shipments.addHistory({
        shipmentId: incident.shipmentId,
        type: HistoryEntryType.INCIDENT,
        fromStatus: incident.status,
        toStatus: dto.status,
        occurredAt: nowIso(),
        userId: actor.id,
        comment: dto.status === IncidentStatus.RESUELTA ? `Incidencia resuelta${dto.resolution ? `: ${dto.resolution}` : ''}` : `Incidencia en ${dto.status === IncidentStatus.EN_REVISION ? 'revisión' : 'estado abierta'}`,
        metadata: { incidentId: id },
      });
      if (dto.status === IncidentStatus.RESUELTA) {
        const shipment = await this.repos.shipments.findById(incident.shipmentId);
        if (shipment?.financialStatus === FinancialStatus.DISPUTA) {
          await this.shipments.setFinancialStatus(shipment.id, FinancialStatus.POR_LIQUIDAR, actor, 'Disputa resuelta; vuelve a pendiente de liquidar');
        }
      }
    }
    const updated = await this.repos.incidents.update(id, patch);
    return this.toView(updated);
  }

  private async toView(i: ShipmentIncident): Promise<IncidentView> {
    const s = await this.repos.shipments.findById(i.shipmentId);
    return {
      ...i,
      shipment: s ? { id: s.id, trackingNumber: s.trackingNumber, customerName: s.customerName, carrierId: s.carrierId } : null,
      reportedBy: await this.users.ref(i.reportedByUserId),
      assignedTo: await this.users.ref(i.assignedUserId),
    };
  }
}

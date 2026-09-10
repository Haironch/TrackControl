import { createRepositories, type Repositories } from './core/persistence/data-source';
import { CarrierService } from './modules/carriers/carrier.service';
import { CustomerService } from './modules/customers/customer.service';
import { DashboardService } from './modules/dashboard/dashboard.service';
import { IncidentService } from './modules/incidents/incident.service';
import { ReportService } from './modules/reports/report.service';
import { SettlementService } from './modules/settlements/settlement.service';
import { ShipmentService } from './modules/shipments/shipment.service';
import { StatusService } from './modules/statuses/status.service';
import { UserService } from './modules/users/user.service';

/**
 * Composition root: aquí se conectan repositorios y servicios.
 * Cambiar el origen de datos solo implica cambiar `createRepositories()`.
 */
export interface Container {
  repos: Repositories;
  users: UserService;
  statuses: StatusService;
  carriers: CarrierService;
  customers: CustomerService;
  shipments: ShipmentService;
  incidents: IncidentService;
  settlements: SettlementService;
  dashboard: DashboardService;
  reports: ReportService;
}

export function createContainer(repos: Repositories = createRepositories()): Container {
  const users = new UserService(repos);
  const statuses = new StatusService(repos);
  const carriers = new CarrierService(repos, statuses);
  const customers = new CustomerService(repos, statuses);
  const shipments = new ShipmentService(repos, statuses, carriers, customers, users);
  const incidents = new IncidentService(repos, shipments, users);
  const settlements = new SettlementService(repos, shipments, carriers, users);
  const dashboard = new DashboardService(repos, statuses, carriers, users);
  const reports = new ReportService(repos, statuses, carriers);
  return { repos, users, statuses, carriers, customers, shipments, incidents, settlements, dashboard, reports };
}

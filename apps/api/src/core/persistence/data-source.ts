import type {
  Carrier,
  Customer,
  Payment,
  Product,
  Settlement,
  SettlementDetail,
  Shipment,
  ShipmentHistory,
  ShipmentIncident,
  ShipmentStatusDefinition,
  User,
} from '@trackcontrol/shared';
import type { Repository } from '../repositories/repository.interface';
import { JsonRepository } from '../repositories/json.repository';
import { JsonDataSource } from './json-data-source';
import { env } from '../../config/env';

/**
 * Conjunto de repositorios que usan los servicios. Es el único punto que conoce el
 * origen de datos concreto; para PostgreSQL se crea `createPrismaRepositories()`.
 */
export interface Repositories {
  users: Repository<User>;
  customers: Repository<Customer>;
  carriers: Repository<Carrier>;
  products: Repository<Product>;
  statuses: Repository<ShipmentStatusDefinition & { id: string }>;
  shipments: Repository<Shipment>;
  history: Repository<ShipmentHistory>;
  incidents: Repository<ShipmentIncident>;
  settlements: Repository<Settlement>;
  settlementDetails: Repository<SettlementDetail>;
  payments: Repository<Payment>;
  flush(): void;
}

export function createJsonRepositories(): Repositories {
  const ds = new JsonDataSource({
    seedDir: env.seedDir,
    runtimeDir: env.runtimeDir,
    persist: env.persistJson,
    shiftDates: env.shiftMockDates,
  });
  return {
    users: new JsonRepository('Usuario', ds.collection<User>('users')),
    customers: new JsonRepository('Cliente', ds.collection<Customer>('customers')),
    carriers: new JsonRepository('Paquetería', ds.collection<Carrier>('carriers')),
    products: new JsonRepository('Producto', ds.collection<Product>('products')),
    statuses: new JsonRepository('Estado', ds.collection<ShipmentStatusDefinition & { id: string }>('shipment-statuses')),
    shipments: new JsonRepository('Envío', ds.collection<Shipment>('shipments')),
    history: new JsonRepository('Historial', ds.collection<ShipmentHistory>('shipment-history')),
    incidents: new JsonRepository('Incidencia', ds.collection<ShipmentIncident>('incidents')),
    settlements: new JsonRepository('Liquidación', ds.collection<Settlement>('settlements')),
    settlementDetails: new JsonRepository('Detalle de liquidación', ds.collection<SettlementDetail>('settlement-details')),
    payments: new JsonRepository('Pago', ds.collection<Payment>('payments')),
    flush: () => ds.flush(),
  };
}

export function createRepositories(): Repositories {
  switch (env.dataSource) {
    case 'postgres':
      // TODO: implementar createPrismaRepositories() usando prisma/schema.prisma
      throw new Error('DATA_SOURCE=postgres todavía no está implementado. Usa DATA_SOURCE=json.');
    case 'json':
    default:
      return createJsonRepositories();
  }
}

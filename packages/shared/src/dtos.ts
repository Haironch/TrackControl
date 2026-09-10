import type {
  Carrier,
  Customer,
  Payment,
  Settlement,
  SettlementDetail,
  Shipment,
  ShipmentHistory,
  ShipmentIncident,
  ShipmentStatusDefinition,
  User,
} from './entities';
import type {
  FinancialStatus,
  IncidentStatus,
  IncidentType,
  PaymentMethod,
  PaymentType,
  StatusCategory,
} from './enums';

// ---------- Respuestas genéricas ----------
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------- Vistas enriquecidas ----------
export interface CarrierRef {
  id: string;
  name: string;
  color: string;
}

export interface UserRef {
  id: string;
  name: string;
  role: string;
}

export interface ShipmentView extends Shipment {
  carrier: CarrierRef;
  assignedUser: UserRef | null;
  statusDefinition: ShipmentStatusDefinition;
}

export interface ShipmentHistoryView extends ShipmentHistory {
  user: UserRef | null;
}

export interface ShipmentDetailView extends ShipmentView {
  history: ShipmentHistoryView[];
  incidents: IncidentView[];
  settlement: Settlement | null;
}

export interface IncidentView extends ShipmentIncident {
  shipment: { id: string; trackingNumber: string; customerName: string; carrierId: string } | null;
  reportedBy: UserRef | null;
  assignedTo: UserRef | null;
}

export interface CarrierView extends Carrier {
  stats: {
    totalShipments: number;
    delivered: number;
    returned: number;
    inTransit: number;
    deliveryRate: number; // 0-100
    collected: number;
    settled: number;
    pending: number;
  };
}

export interface CustomerView extends Customer {
  stats: {
    orders: number;
    delivered: number;
    rejected: number;
    totalSpent: number;
    lastOrderAt: string | null;
  };
}

export interface SettlementView extends Settlement {
  carrier: CarrierRef;
  createdBy: UserRef | null;
  details: (SettlementDetail & { shipment: { id: string; trackingNumber: string; customerName: string; deliveredAt: string | null } | null })[];
  payments: Payment[];
}

// ---------- Queries ----------
export type SortDirection = 'asc' | 'desc';

export interface ShipmentQuery {
  search?: string;
  status?: string;
  category?: StatusCategory;
  carrierId?: string;
  customerId?: string;
  department?: string;
  financialStatus?: FinancialStatus;
  paymentType?: PaymentType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'amountToCollect' | 'customerName' | 'status' | 'trackingNumber' | 'deliveredAt';
  sortDir?: SortDirection;
}

// ---------- Comandos ----------
export interface ShipmentProductInput {
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateShipmentDto {
  carrierId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  department: string;
  municipality: string;
  description: string;
  products?: ShipmentProductInput[];
  itemsCount?: number;
  productValue: number;
  amountToCollect: number;
  shippingCost: number;
  paymentType: PaymentType;
  carrierGuideNumber?: string | null;
  estimatedDeliveryAt?: string | null;
  assignedUserId?: string | null;
  notes?: string | null;
}

export type UpdateShipmentDto = Partial<CreateShipmentDto>;

export interface ChangeStatusDto {
  status: string;
  comment?: string | null;
  occurredAt?: string | null;
  carrierGuideNumber?: string | null;
}

export interface CreateIncidentDto {
  shipmentId: string;
  type: IncidentType;
  description: string;
  assignedUserId?: string | null;
  /** Si es true, el envío pasa al estado INCIDENCIA. */
  moveShipmentToIncident?: boolean;
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  resolution?: string | null;
  assignedUserId?: string | null;
  description?: string;
}

export interface CreateSettlementDto {
  carrierId: string;
  date: string;
  shipmentIds: string[];
  totalAmount?: number; // si difiere de lo cobrado se registra ajuste
  reference?: string | null;
  notes?: string | null;
  confirm?: boolean;
  payment?: {
    method: PaymentMethod;
    reference?: string | null;
    bankName?: string | null;
  } | null;
}

export interface CreateCarrierDto {
  name: string;
  code?: string;
  phone: string;
  contactName: string;
  email?: string | null;
  color: string;
  active?: boolean;
}
export type UpdateCarrierDto = Partial<CreateCarrierDto>;

export interface CreateCustomerDto {
  name: string;
  phone: string;
  address: string;
  department: string;
  municipality: string;
  email?: string | null;
  notes?: string | null;
}
export type UpdateCustomerDto = Partial<CreateCustomerDto>;

// ---------- Dashboard ----------
export interface DashboardSummary {
  counts: {
    total: number;
    sentToday: number;
    inTransit: number;
    delivered: number;
    pendingDelivery: number;
    rejected: number;
    returning: number;
    returned: number;
    withIncidents: number;
    pendingSettlement: number;
  };
  financial: {
    totalSold: number;
    totalDelivered: number;
    totalPendingCollection: number;
    totalSettled: number;
    pendingToReceive: number;
    shippingCosts: number;
    returnedValue: number;
    inDispute: number;
  };
  today: {
    shipped: number;
    delivered: number;
    returned: number;
    incidents: number;
    collectedToday: number;
    pendingSettlementAmount: number;
  };
  byCarrier: {
    carrier: CarrierRef;
    total: number;
    delivered: number;
    pendingAmount: number;
    deliveryRate: number;
  }[];
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string;
  shipped: number;
  delivered: number;
  returned: number;
}

export interface DashboardStatistics {
  rangeDays: number;
  daily: DailyPoint[];
  byStatus: { code: string; label: string; color: string; category: StatusCategory; count: number }[];
  byCategory: { category: StatusCategory; label: string; color: string; count: number }[];
  successRate: { delivered: number; returned: number; inProgress: number; rate: number };
  salesByWeek: { week: string; label: string; sold: number; delivered: number; settled: number }[];
  carrierPerformance: {
    carrier: CarrierRef;
    total: number;
    delivered: number;
    returned: number;
    inTransit: number;
    deliveryRate: number;
    avgDeliveryDays: number | null;
    pendingAmount: number;
  }[];
  financialByStatus: { status: FinancialStatus; label: string; color: string; count: number; amount: number }[];
}

export interface ActivityItem extends ShipmentHistory {
  user: UserRef | null;
  shipment: { id: string; trackingNumber: string; customerName: string } | null;
}

// ---------- Reportes ----------
export type ReportGroupBy = 'day' | 'week' | 'month';

export interface ReportQuery {
  from?: string;
  to?: string;
  carrierId?: string;
  groupBy?: ReportGroupBy;
}

export interface ReportTable {
  id: string;
  title: string;
  description: string;
  columns: { key: string; label: string; type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'status' }[];
  rows: Record<string, string | number | null>[];
  totals?: Record<string, string | number | null>;
  generatedAt: string;
  filters: ReportQuery;
}

export interface AuthContext {
  user: User;
  permissions: string[];
}

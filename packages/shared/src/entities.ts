import type {
  FinancialStatus,
  HistoryEntryType,
  IncidentStatus,
  IncidentType,
  PaymentMethod,
  PaymentType,
  SettlementStatus,
  ShipmentStatusCode,
  StatusCategory,
  UserRole,
} from './enums';

/** Fecha en formato ISO-8601 (string) para que viaje sin problemas por JSON. */
export type ISODateString = string;

export interface BaseEntity {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  avatarColor: string;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  address: string;
  department: string;
  municipality: string;
  email?: string | null;
  notes?: string | null;
}

export interface Carrier extends BaseEntity {
  name: string;
  code: string;
  phone: string;
  contactName: string;
  email?: string | null;
  active: boolean;
  color: string;
  /** Preparado para integraciones API / tracking automático. */
  integration?: {
    provider: string | null;
    apiKey: string | null;
    webhookUrl: string | null;
    trackingUrlTemplate: string | null;
  } | null;
}

/** Definición configurable de un estado operativo del envío. */
export interface ShipmentStatusDefinition {
  code: ShipmentStatusCode | string;
  label: string;
  description: string;
  category: StatusCategory;
  color: string; // token de color usado por el frontend
  order: number;
  isFinal: boolean;
  /** Transiciones permitidas desde este estado. */
  nextStatuses: string[];
  /** Acción rápida sugerida en la UI (ej. "Marcar como entregado"). */
  quickActionLabel?: string | null;
}

export interface Product extends BaseEntity {
  sku: string;
  name: string;
  price: number;
  active: boolean;
}

export interface ShipmentProduct {
  id: string;
  shipmentId: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Attachment {
  id: string;
  kind: 'PHOTO' | 'DOCUMENT' | 'SIGNATURE' | 'DELIVERY_PROOF' | 'RETURN_PROOF';
  url: string;
  name: string;
  uploadedAt: ISODateString;
  uploadedByUserId: string | null;
}

export interface Shipment extends BaseEntity {
  trackingNumber: string;
  carrierGuideNumber: string | null;
  carrierId: string;
  customerId: string;
  /** Snapshot del cliente al momento del envío (no cambia si el cliente edita sus datos). */
  customerName: string;
  customerPhone: string;
  address: string;
  department: string;
  municipality: string;
  description: string;
  itemsCount: number;
  productValue: number;
  amountToCollect: number;
  shippingCost: number;
  paymentType: PaymentType;
  status: ShipmentStatusCode | string;
  financialStatus: FinancialStatus;
  assignedUserId: string | null;
  notes: string | null;
  deliveredToCarrierAt: ISODateString | null;
  estimatedDeliveryAt: ISODateString | null;
  deliveredAt: ISODateString | null;
  returnedAt: ISODateString | null;
  settlementId: string | null;
  products: ShipmentProduct[];
  // --- Preparado para el futuro ---
  coordinates: GeoPoint | null;
  attachments: Attachment[];
}

export interface ShipmentHistory {
  id: string;
  shipmentId: string;
  type: HistoryEntryType;
  fromStatus: string | null;
  toStatus: string | null;
  occurredAt: ISODateString;
  userId: string | null;
  comment: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ShipmentIncident extends BaseEntity {
  shipmentId: string;
  type: IncidentType;
  description: string;
  status: IncidentStatus;
  reportedByUserId: string | null;
  assignedUserId: string | null;
  resolution: string | null;
  resolvedAt: ISODateString | null;
}

export interface Settlement extends BaseEntity {
  number: string; // LQ-00042
  carrierId: string;
  date: ISODateString;
  status: SettlementStatus;
  shipmentsCount: number;
  totalCollected: number; // suma de lo cobrado a clientes
  totalAmount: number; // monto realmente liquidado por la paquetería
  adjustment: number; // diferencia (negativa = la paquetería pagó menos)
  reference: string | null;
  notes: string | null;
  createdByUserId: string | null;
  confirmedAt: ISODateString | null;
}

export interface SettlementDetail {
  id: string;
  settlementId: string;
  shipmentId: string;
  amountCollected: number;
  amountSettled: number;
  adjustment: number;
  note: string | null;
}

export interface Payment extends BaseEntity {
  settlementId: string;
  method: PaymentMethod;
  reference: string | null;
  bankName: string | null;
  amount: number;
  paidAt: ISODateString;
}

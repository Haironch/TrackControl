/**
 * Enumeraciones del dominio. Se definen como "const objects" + union types para
 * que sean serializables en JSON y directamente mapeables a enums de Prisma/PostgreSQL.
 */

export const ShipmentStatusCode = {
  NUEVO: 'NUEVO',
  PREPARADO: 'PREPARADO',
  ENTREGADO_A_PAQUETERIA: 'ENTREGADO_A_PAQUETERIA',
  EN_TRANSITO: 'EN_TRANSITO',
  EN_RUTA: 'EN_RUTA',
  ENTREGADO: 'ENTREGADO',
  CLIENTE_NO_RECIBIO: 'CLIENTE_NO_RECIBIO',
  REINTENTO: 'REINTENTO',
  RECHAZADO: 'RECHAZADO',
  EN_RETORNO: 'EN_RETORNO',
  RECIBIDO_EN_BODEGA: 'RECIBIDO_EN_BODEGA',
  INCIDENCIA: 'INCIDENCIA',
  EN_ESPERA: 'EN_ESPERA',
} as const;
export type ShipmentStatusCode = (typeof ShipmentStatusCode)[keyof typeof ShipmentStatusCode];

/** Agrupación operativa de los estados. Sirve para tarjetas del dashboard y filtros. */
export const StatusCategory = {
  PENDING: 'PENDING', // aún en manos de la empresa
  IN_TRANSIT: 'IN_TRANSIT', // en manos de la paquetería
  DELIVERED: 'DELIVERED',
  RETURNING: 'RETURNING', // rechazado / en retorno
  RETURNED: 'RETURNED', // ya recibido de nuevo en bodega
  INCIDENT: 'INCIDENT',
} as const;
export type StatusCategory = (typeof StatusCategory)[keyof typeof StatusCategory];

export const FinancialStatus = {
  PENDIENTE: 'PENDIENTE', // todavía no se ha entregado
  POR_LIQUIDAR: 'POR_LIQUIDAR', // entregado, la paquetería debe el dinero
  LIQUIDADO: 'LIQUIDADO', // la paquetería ya pagó
  AJUSTE: 'AJUSTE', // se liquidó con diferencia
  DISPUTA: 'DISPUTA', // en reclamo con la paquetería
  NO_APLICA: 'NO_APLICA', // envío prepagado / sin cobro
} as const;
export type FinancialStatus = (typeof FinancialStatus)[keyof typeof FinancialStatus];

export const PaymentType = {
  CONTRA_ENTREGA: 'CONTRA_ENTREGA',
  PREPAGADO: 'PREPAGADO',
  TRANSFERENCIA: 'TRANSFERENCIA',
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const IncidentType = {
  DIRECCION_INCORRECTA: 'DIRECCION_INCORRECTA',
  CLIENTE_NO_RESPONDE: 'CLIENTE_NO_RESPONDE',
  CLIENTE_RECHAZO: 'CLIENTE_RECHAZO',
  PAQUETE_DANADO: 'PAQUETE_DANADO',
  PAQUETE_PERDIDO: 'PAQUETE_PERDIDO',
  PROBLEMA_PAQUETERIA: 'PROBLEMA_PAQUETERIA',
  PAGO_INCORRECTO: 'PAGO_INCORRECTO',
  OTRO: 'OTRO',
} as const;
export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType];

export const IncidentStatus = {
  ABIERTA: 'ABIERTA',
  EN_REVISION: 'EN_REVISION',
  RESUELTA: 'RESUELTA',
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const SettlementStatus = {
  PENDIENTE: 'PENDIENTE',
  CONFIRMADA: 'CONFIRMADA',
  ANULADA: 'ANULADA',
} as const;
export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];

export const PaymentMethod = {
  DEPOSITO: 'DEPOSITO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  EFECTIVO: 'EFECTIVO',
  CHEQUE: 'CHEQUE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const UserRole = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  OPERADOR: 'OPERADOR',
  BODEGA: 'BODEGA',
  CONTABILIDAD: 'CONTABILIDAD',
  SUPERVISOR: 'SUPERVISOR',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const HistoryEntryType = {
  STATUS: 'STATUS',
  FINANCIAL: 'FINANCIAL',
  INCIDENT: 'INCIDENT',
  SETTLEMENT: 'SETTLEMENT',
  NOTE: 'NOTE',
  EDIT: 'EDIT',
} as const;
export type HistoryEntryType = (typeof HistoryEntryType)[keyof typeof HistoryEntryType];

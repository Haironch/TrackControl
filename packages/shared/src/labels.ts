import {
  IncidentStatus,
  IncidentType,
  PaymentMethod,
  PaymentType,
  SettlementStatus,
  UserRole,
} from './enums';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.CONTRA_ENTREGA]: 'Contra entrega',
  [PaymentType.PREPAGADO]: 'Prepagado',
  [PaymentType.TRANSFERENCIA]: 'Transferencia',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  [IncidentType.DIRECCION_INCORRECTA]: 'Dirección incorrecta',
  [IncidentType.CLIENTE_NO_RESPONDE]: 'Cliente no responde',
  [IncidentType.CLIENTE_RECHAZO]: 'Cliente rechazó paquete',
  [IncidentType.PAQUETE_DANADO]: 'Paquete dañado',
  [IncidentType.PAQUETE_PERDIDO]: 'Paquete perdido',
  [IncidentType.PROBLEMA_PAQUETERIA]: 'Problema con paquetería',
  [IncidentType.PAGO_INCORRECTO]: 'Pago incorrecto',
  [IncidentType.OTRO]: 'Otro',
};

export const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; color: string }> = {
  [IncidentStatus.ABIERTA]: { label: 'Abierta', color: 'red' },
  [IncidentStatus.EN_REVISION]: { label: 'En revisión', color: 'amber' },
  [IncidentStatus.RESUELTA]: { label: 'Resuelta', color: 'emerald' },
};

export const SETTLEMENT_STATUS_META: Record<SettlementStatus, { label: string; color: string }> = {
  [SettlementStatus.PENDIENTE]: { label: 'Pendiente', color: 'amber' },
  [SettlementStatus.CONFIRMADA]: { label: 'Confirmada', color: 'emerald' },
  [SettlementStatus.ANULADA]: { label: 'Anulada', color: 'red' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.DEPOSITO]: 'Depósito',
  [PaymentMethod.TRANSFERENCIA]: 'Transferencia',
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.CHEQUE]: 'Cheque',
};

export const USER_ROLE_META: Record<UserRole, { label: string; description: string; color: string }> = {
  [UserRole.ADMINISTRADOR]: { label: 'Administrador', description: 'Acceso completo al sistema.', color: 'violet' },
  [UserRole.OPERADOR]: { label: 'Operador', description: 'Crea paquetes y actualiza estados.', color: 'sky' },
  [UserRole.BODEGA]: { label: 'Bodega', description: 'Registra salidas y retornos de paquetes.', color: 'amber' },
  [UserRole.CONTABILIDAD]: { label: 'Contabilidad', description: 'Trabaja liquidaciones y control financiero.', color: 'emerald' },
  [UserRole.SUPERVISOR]: { label: 'Supervisor', description: 'Visualiza reportes y estadísticas.', color: 'slate' },
};

/** Permisos por rol. Es la base para la futura autorización granular. */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMINISTRADOR]: ['*'],
  [UserRole.OPERADOR]: [
    'shipments:read',
    'shipments:create',
    'shipments:update',
    'shipments:change-status',
    'customers:read',
    'customers:write',
    'incidents:read',
    'incidents:write',
    'carriers:read',
    'dashboard:read',
  ],
  [UserRole.BODEGA]: ['shipments:read', 'shipments:change-status', 'carriers:read', 'dashboard:read', 'incidents:read'],
  [UserRole.CONTABILIDAD]: [
    'shipments:read',
    'settlements:read',
    'settlements:write',
    'carriers:read',
    'reports:read',
    'dashboard:read',
    'incidents:read',
  ],
  [UserRole.SUPERVISOR]: [
    'shipments:read',
    'settlements:read',
    'carriers:read',
    'customers:read',
    'incidents:read',
    'reports:read',
    'dashboard:read',
    'users:read',
  ],
};

export function hasPermission(role: UserRole, permission: string) {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

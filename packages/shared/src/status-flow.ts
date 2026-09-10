import { FinancialStatus, ShipmentStatusCode, StatusCategory } from './enums';
import type { ShipmentStatusDefinition } from './entities';

/**
 * Catálogo por defecto de estados operativos. Es la "semilla" que se carga en el
 * repositorio de estados; en producción puede administrarse desde la base de datos.
 */
export const DEFAULT_SHIPMENT_STATUSES: ShipmentStatusDefinition[] = [
  {
    code: ShipmentStatusCode.NUEVO,
    label: 'Nuevo',
    description: 'Envío registrado, pendiente de preparar.',
    category: StatusCategory.PENDING,
    color: 'slate',
    order: 10,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.PREPARADO, ShipmentStatusCode.ENTREGADO_A_PAQUETERIA],
    quickActionLabel: null,
  },
  {
    code: ShipmentStatusCode.PREPARADO,
    label: 'Preparado',
    description: 'Empacado y listo para salir de bodega.',
    category: StatusCategory.PENDING,
    color: 'blue',
    order: 20,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.ENTREGADO_A_PAQUETERIA],
    quickActionLabel: 'Marcar como preparado',
  },
  {
    code: ShipmentStatusCode.ENTREGADO_A_PAQUETERIA,
    label: 'Entregado a paquetería',
    description: 'La paquetería recibió el paquete.',
    category: StatusCategory.IN_TRANSIT,
    color: 'indigo',
    order: 30,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.EN_TRANSITO, ShipmentStatusCode.INCIDENCIA],
    quickActionLabel: 'Registrar salida a paquetería',
  },
  {
    code: ShipmentStatusCode.EN_TRANSITO,
    label: 'En tránsito',
    description: 'El paquete viaja hacia el destino.',
    category: StatusCategory.IN_TRANSIT,
    color: 'sky',
    order: 40,
    isFinal: false,
    nextStatuses: [
      ShipmentStatusCode.EN_RUTA,
      ShipmentStatusCode.CLIENTE_NO_RECIBIO,
      ShipmentStatusCode.RECHAZADO,
      ShipmentStatusCode.INCIDENCIA,
    ],
    quickActionLabel: null,
  },
  {
    code: ShipmentStatusCode.EN_RUTA,
    label: 'En ruta de entrega',
    description: 'El repartidor lo lleva al cliente.',
    category: StatusCategory.IN_TRANSIT,
    color: 'cyan',
    order: 50,
    isFinal: false,
    nextStatuses: [
      ShipmentStatusCode.ENTREGADO,
      ShipmentStatusCode.CLIENTE_NO_RECIBIO,
      ShipmentStatusCode.RECHAZADO,
      ShipmentStatusCode.INCIDENCIA,
    ],
    quickActionLabel: null,
  },
  {
    code: ShipmentStatusCode.ENTREGADO,
    label: 'Entregado',
    description: 'Entregado al cliente final.',
    category: StatusCategory.DELIVERED,
    color: 'emerald',
    order: 60,
    isFinal: true,
    nextStatuses: [ShipmentStatusCode.INCIDENCIA],
    quickActionLabel: 'Marcar como entregado',
  },
  {
    code: ShipmentStatusCode.CLIENTE_NO_RECIBIO,
    label: 'Cliente no recibió',
    description: 'No se encontró al cliente en el primer intento.',
    category: StatusCategory.IN_TRANSIT,
    color: 'amber',
    order: 70,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.REINTENTO, ShipmentStatusCode.RECHAZADO, ShipmentStatusCode.INCIDENCIA],
    quickActionLabel: null,
  },
  {
    code: ShipmentStatusCode.REINTENTO,
    label: 'Reintento',
    description: 'Programado un nuevo intento de entrega.',
    category: StatusCategory.IN_TRANSIT,
    color: 'orange',
    order: 80,
    isFinal: false,
    nextStatuses: [
      ShipmentStatusCode.EN_RUTA,
      ShipmentStatusCode.ENTREGADO,
      ShipmentStatusCode.CLIENTE_NO_RECIBIO,
      ShipmentStatusCode.RECHAZADO,
    ],
    quickActionLabel: 'Programar reintento',
  },
  {
    code: ShipmentStatusCode.RECHAZADO,
    label: 'Rechazado',
    description: 'El cliente rechazó el paquete.',
    category: StatusCategory.RETURNING,
    color: 'red',
    order: 90,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.EN_RETORNO, ShipmentStatusCode.INCIDENCIA],
    quickActionLabel: 'Registrar rechazo',
  },
  {
    code: ShipmentStatusCode.EN_RETORNO,
    label: 'En retorno',
    description: 'La paquetería devuelve el paquete a la empresa.',
    category: StatusCategory.RETURNING,
    color: 'rose',
    order: 100,
    isFinal: false,
    nextStatuses: [ShipmentStatusCode.RECIBIDO_EN_BODEGA, ShipmentStatusCode.INCIDENCIA],
    quickActionLabel: 'Registrar devolución',
  },
  {
    code: ShipmentStatusCode.RECIBIDO_EN_BODEGA,
    label: 'Recibido en bodega',
    description: 'El paquete devuelto ya está de regreso en la empresa.',
    category: StatusCategory.RETURNED,
    color: 'fuchsia',
    order: 110,
    isFinal: true,
    nextStatuses: [],
    quickActionLabel: 'Confirmar recepción en bodega',
  },
  {
    code: ShipmentStatusCode.INCIDENCIA,
    label: 'Incidencia',
    description: 'Existe un problema que requiere revisión.',
    category: StatusCategory.INCIDENT,
    color: 'yellow',
    order: 120,
    isFinal: false,
    nextStatuses: [
      ShipmentStatusCode.EN_ESPERA,
      ShipmentStatusCode.EN_TRANSITO,
      ShipmentStatusCode.EN_RUTA,
      ShipmentStatusCode.ENTREGADO,
      ShipmentStatusCode.EN_RETORNO,
      ShipmentStatusCode.RECHAZADO,
    ],
    quickActionLabel: 'Registrar incidencia',
  },
  {
    code: ShipmentStatusCode.EN_ESPERA,
    label: 'En espera',
    description: 'Detenido hasta resolver la incidencia.',
    category: StatusCategory.INCIDENT,
    color: 'stone',
    order: 130,
    isFinal: false,
    nextStatuses: [
      ShipmentStatusCode.EN_TRANSITO,
      ShipmentStatusCode.EN_RUTA,
      ShipmentStatusCode.ENTREGADO,
      ShipmentStatusCode.EN_RETORNO,
      ShipmentStatusCode.RECHAZADO,
    ],
    quickActionLabel: null,
  },
];

export const FINANCIAL_STATUS_META: Record<FinancialStatus, { label: string; color: string; description: string }> = {
  [FinancialStatus.PENDIENTE]: { label: 'Pendiente', color: 'slate', description: 'Aún no se entrega ni se cobra.' },
  [FinancialStatus.POR_LIQUIDAR]: { label: 'Por liquidar', color: 'amber', description: 'Entregado; la paquetería debe el dinero.' },
  [FinancialStatus.LIQUIDADO]: { label: 'Liquidado', color: 'emerald', description: 'La paquetería ya entregó el dinero.' },
  [FinancialStatus.AJUSTE]: { label: 'Ajuste', color: 'violet', description: 'Liquidado con diferencia.' },
  [FinancialStatus.DISPUTA]: { label: 'Disputa', color: 'red', description: 'En reclamo con la paquetería.' },
  [FinancialStatus.NO_APLICA]: { label: 'No aplica', color: 'zinc', description: 'Sin cobro contra entrega.' },
};

export const STATUS_CATEGORY_META: Record<StatusCategory, { label: string; color: string }> = {
  [StatusCategory.PENDING]: { label: 'Pendiente de salida', color: 'slate' },
  [StatusCategory.IN_TRANSIT]: { label: 'En tránsito', color: 'sky' },
  [StatusCategory.DELIVERED]: { label: 'Entregado', color: 'emerald' },
  [StatusCategory.RETURNING]: { label: 'En retorno', color: 'rose' },
  [StatusCategory.RETURNED]: { label: 'Devuelto', color: 'fuchsia' },
  [StatusCategory.INCIDENT]: { label: 'Incidencia', color: 'yellow' },
};

export function findStatus(code: string, catalog: ShipmentStatusDefinition[] = DEFAULT_SHIPMENT_STATUSES) {
  return catalog.find((s) => s.code === code) ?? null;
}

export function isTransitionAllowed(
  from: string,
  to: string,
  catalog: ShipmentStatusDefinition[] = DEFAULT_SHIPMENT_STATUSES,
) {
  const def = findStatus(from, catalog);
  return def ? def.nextStatuses.includes(to) : false;
}

/** Categorías que representan un paquete que no llegó al cliente. */
export const RETURN_CATEGORIES: StatusCategory[] = [StatusCategory.RETURNING, StatusCategory.RETURNED];
/** Estados operativos de retorno. */
export const RETURN_STATUSES: string[] = [ShipmentStatusCode.RECHAZADO, ShipmentStatusCode.EN_RETORNO, ShipmentStatusCode.RECIBIDO_EN_BODEGA];
/** Estados financieros en los que la paquetería ya pagó. */
export const SETTLED_FINANCIAL_STATUSES: FinancialStatus[] = [FinancialStatus.LIQUIDADO, FinancialStatus.AJUSTE];

export const isReturnCategory = (c: StatusCategory | undefined | null) => !!c && RETURN_CATEGORIES.includes(c);
export const isSettled = (f: FinancialStatus) => SETTLED_FINANCIAL_STATUSES.includes(f);

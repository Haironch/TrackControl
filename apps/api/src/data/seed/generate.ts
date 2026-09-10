/* eslint-disable no-console */
/**
 * Generador de datos simulados. Ejecutar con `npm run seed` (desde apps/api o la raíz).
 * Produce archivos JSON deterministas (PRNG con semilla) en apps/api/data/seed y
 * limpia apps/api/data/runtime para reiniciar el estado del demo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SHIPMENT_STATUSES,
  FinancialStatus,
  HistoryEntryType,
  IncidentStatus,
  IncidentType,
  PaymentMethod,
  PaymentType,
  RETURN_STATUSES,
  SettlementStatus,
  ShipmentStatusCode,
  UserRole,
  type Carrier,
  type Customer,
  type Payment,
  type Product,
  type Settlement,
  type SettlementDetail,
  type Shipment,
  type ShipmentHistory,
  type ShipmentIncident,
  type User,
} from '@trackcontrol/shared';
import { env } from '../../config/env';

// ---------- PRNG determinista ----------
let seed = 20260909;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
const money = (n: number) => Math.round(n * 100) / 100;

let counter = 0;
const id = (prefix: string) => `${prefix}_${(++counter).toString(36).padStart(6, '0')}`;

const NOW = new Date();
NOW.setHours(16, 30, 0, 0);
const iso = (d: Date) => d.toISOString();
const at = (daysAgo: number, hour: number, minute = int(0, 59)) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, int(0, 59), 0);
  return d;
};
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

// ---------- Catálogos base ----------
const DEPARTMENTS: Record<string, string[]> = {
  Guatemala: ['Guatemala', 'Mixco', 'Villa Nueva', 'San Miguel Petapa', 'Santa Catarina Pinula', 'Villa Canales'],
  Quetzaltenango: ['Quetzaltenango', 'Salcajá', 'Olintepeque', 'Coatepeque', 'La Esperanza'],
  Sacatepéquez: ['Antigua Guatemala', 'Jocotenango', 'Ciudad Vieja', 'San Lucas Sacatepéquez'],
  Escuintla: ['Escuintla', 'Santa Lucía Cotzumalguapa', 'Puerto San José'],
  Huehuetenango: ['Huehuetenango', 'Chiantla', 'La Democracia'],
  'Alta Verapaz': ['Cobán', 'San Pedro Carchá', 'Tactic'],
  Petén: ['Flores', 'San Benito', 'Santa Elena'],
  Izabal: ['Puerto Barrios', 'Morales', 'Río Dulce'],
  Chimaltenango: ['Chimaltenango', 'Tecpán', 'Patzún'],
  Sololá: ['Sololá', 'Panajachel', 'Santiago Atitlán'],
  Retalhuleu: ['Retalhuleu', 'San Sebastián'],
  'San Marcos': ['San Marcos', 'San Pedro Sacatepéquez', 'Malacatán'],
  Jutiapa: ['Jutiapa', 'Asunción Mita'],
  Zacapa: ['Zacapa', 'Gualán'],
  Chiquimula: ['Chiquimula', 'Esquipulas'],
  Suchitepéquez: ['Mazatenango', 'San Antonio Suchitepéquez'],
};
const DEPT_KEYS = Object.keys(DEPARTMENTS);
const DEPT_WEIGHTS = DEPT_KEYS.map((d) => (d === 'Guatemala' ? 8 : d === 'Quetzaltenango' ? 4 : d === 'Sacatepéquez' || d === 'Escuintla' ? 2 : 1));
function pickDepartment() {
  const total = DEPT_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < DEPT_KEYS.length; i++) {
    r -= DEPT_WEIGHTS[i];
    if (r <= 0) return DEPT_KEYS[i];
  }
  return DEPT_KEYS[0];
}

const FIRST = ['María', 'José', 'Ana', 'Carlos', 'Lucía', 'Juan', 'Sofía', 'Luis', 'Andrea', 'Diego', 'Gabriela', 'Pedro', 'Valeria', 'Miguel', 'Daniela', 'Jorge', 'Fernanda', 'Ricardo', 'Paola', 'Manuel', 'Alejandra', 'Roberto', 'Karla', 'Edgar', 'Mónica', 'Héctor', 'Ingrid', 'Óscar', 'Claudia', 'Rodrigo'];
const LAST = ['García', 'López', 'Pérez', 'Morales', 'Hernández', 'Ramírez', 'Castillo', 'Méndez', 'Gómez', 'Xol', 'Chávez', 'Tzul', 'Ajanel', 'Ordóñez', 'Estrada', 'Reyes', 'Sánchez', 'Velásquez', 'De León', 'Mazariegos', 'Coy', 'Cifuentes', 'Barrios', 'Flores'];
const STREETS = ['Calle', 'Avenida', 'Diagonal', 'Boulevard', 'Calzada'];
const ZONES = ['zona 1', 'zona 3', 'zona 5', 'zona 7', 'zona 10', 'zona 11', 'zona 12', 'zona 18', 'colonia El Milagro', 'colonia Las Victorias', 'residenciales Los Álamos', 'barrio San Antonio'];

const PRODUCTS: { sku: string; name: string; price: number }[] = [
  { sku: 'TEN-001', name: 'Tenis deportivos Runner', price: 425 },
  { sku: 'BLU-014', name: 'Blusa casual manga larga', price: 165 },
  { sku: 'PER-007', name: 'Perfume Essence 100ml', price: 380 },
  { sku: 'AUD-021', name: 'Audífonos inalámbricos Pro', price: 295 },
  { sku: 'REL-003', name: 'Reloj inteligente Fit', price: 650 },
  { sku: 'MOC-002', name: 'Mochila urbana impermeable', price: 245 },
  { sku: 'CAR-009', name: 'Cargador rápido 65W', price: 185 },
  { sku: 'FUN-011', name: 'Funda celular reforzada', price: 75 },
  { sku: 'LEN-004', name: 'Lentes de sol polarizados', price: 210 },
  { sku: 'PAN-016', name: 'Pantalón jeans slim', price: 240 },
  { sku: 'JUG-005', name: 'Set de juguetes didácticos', price: 320 },
  { sku: 'PLA-008', name: 'Plancha de cabello cerámica', price: 275 },
  { sku: 'BOC-012', name: 'Bocina bluetooth portátil', price: 340 },
  { sku: 'KIT-006', name: 'Kit de skincare (5 piezas)', price: 445 },
  { sku: 'TEC-010', name: 'Teclado mecánico compacto', price: 520 },
  { sku: 'LAM-013', name: 'Lámpara LED de escritorio', price: 155 },
];

const DESCRIPTIONS = ['Caja pequeña', 'Caja mediana', 'Bolsa sellada', 'Sobre acolchado', 'Caja grande'];

// ---------- Generación ----------
const now = iso(NOW);
const base = (createdAt = now) => ({ createdAt, updatedAt: createdAt });

const users: User[] = [
  { id: 'usr_admin', name: 'Andrea López', email: 'andrea@trackcontrol.gt', role: UserRole.ADMINISTRADOR, active: true, avatarColor: '#7c3aed', ...base(iso(at(120, 9))) },
  { id: 'usr_operador', name: 'Carlos Méndez', email: 'carlos@trackcontrol.gt', role: UserRole.OPERADOR, active: true, avatarColor: '#0284c7', ...base(iso(at(110, 9))) },
  { id: 'usr_bodega', name: 'Luis Pérez', email: 'luis@trackcontrol.gt', role: UserRole.BODEGA, active: true, avatarColor: '#d97706', ...base(iso(at(100, 9))) },
  { id: 'usr_conta', name: 'María García', email: 'maria@trackcontrol.gt', role: UserRole.CONTABILIDAD, active: true, avatarColor: '#059669', ...base(iso(at(95, 9))) },
  { id: 'usr_super', name: 'Jorge Ramírez', email: 'jorge@trackcontrol.gt', role: UserRole.SUPERVISOR, active: true, avatarColor: '#475569', ...base(iso(at(80, 9))) },
  { id: 'usr_inactivo', name: 'Sandra Ruiz', email: 'sandra@trackcontrol.gt', role: UserRole.OPERADOR, active: false, avatarColor: '#94a3b8', ...base(iso(at(200, 9))) },
];

const carriers: Carrier[] = [
  { id: 'car_cargoexpress', name: 'Cargo Express', code: 'CEX', phone: '+502 2379-4500', contactName: 'Mynor Castañeda', email: 'operaciones@cargoexpress.gt', active: true, color: '#0ea5e9', integration: { provider: null, apiKey: null, webhookUrl: null, trackingUrlTemplate: 'https://cargoexpress.gt/track/{guide}' }, ...base(iso(at(120, 9))) },
  { id: 'car_forza', name: 'Forza', code: 'FRZ', phone: '+502 2314-1200', contactName: 'Patricia Aguilar', email: 'clientes@forza.com.gt', active: true, color: '#f97316', integration: { provider: null, apiKey: null, webhookUrl: null, trackingUrlTemplate: 'https://forza.com.gt/rastreo/{guide}' }, ...base(iso(at(120, 9))) },
  { id: 'car_guatex', name: 'Guatex', code: 'GTX', phone: '+502 2379-8000', contactName: 'Rolando Vásquez', email: 'servicio@guatex.com', active: true, color: '#ef4444', integration: { provider: null, apiKey: null, webhookUrl: null, trackingUrlTemplate: 'https://guatex.com/rastreo?guia={guide}' }, ...base(iso(at(120, 9))) },
  { id: 'car_cargoexpreso', name: 'Cargo Expreso', code: 'CXP', phone: '+502 2413-9000', contactName: 'Silvia Monroy', email: 'ventas@cargoexpreso.com', active: true, color: '#8b5cf6', integration: null, ...base(iso(at(120, 9))) },
  { id: 'car_interna', name: 'Mensajería interna', code: 'INT', phone: '+502 5512-3344', contactName: 'Luis Pérez', email: null, active: true, color: '#10b981', integration: null, ...base(iso(at(120, 9))) },
];
const CARRIER_WEIGHTS = [0.34, 0.24, 0.2, 0.14, 0.08];
function pickCarrier() {
  let r = rnd();
  for (let i = 0; i < carriers.length; i++) {
    r -= CARRIER_WEIGHTS[i];
    if (r <= 0) return carriers[i];
  }
  return carriers[0];
}
const guidePrefix: Record<string, string> = { car_cargoexpress: 'CE', car_forza: 'FZ', car_guatex: 'GX', car_cargoexpreso: 'CXP', car_interna: 'INT' };

const products: Product[] = PRODUCTS.map((p) => ({ id: id('prd'), ...p, active: true, ...base(iso(at(90, 9))) }));

const customers: Customer[] = Array.from({ length: 30 }, (_, i) => {
  const department = pickDepartment();
  const municipality = pick(DEPARTMENTS[department]);
  const created = at(int(20, 90), int(8, 18));
  return {
    id: `cus_${String(i + 1).padStart(3, '0')}`,
    name: `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
    phone: `+502 ${int(3, 5)}${int(100, 999)}-${int(1000, 9999)}`,
    address: `${int(1, 25)} ${pick(STREETS)} ${int(1, 30)}-${int(10, 99)}, ${pick(ZONES)}`,
    department,
    municipality,
    email: chance(0.5) ? `cliente${i + 1}@correo.com` : null,
    notes: null,
    ...base(iso(created)),
  };
});
// Algunos clientes "problemáticos" con más rechazos
const troubleCustomers = new Set([customers[4].id, customers[11].id, customers[22].id]);

// Plan de estados (124 envíos)
const STATUS_PLAN: { status: ShipmentStatusCode; count: number; minAge: number; maxAge: number }[] = [
  { status: ShipmentStatusCode.NUEVO, count: 7, minAge: 0, maxAge: 1 },
  { status: ShipmentStatusCode.PREPARADO, count: 5, minAge: 0, maxAge: 1 },
  { status: ShipmentStatusCode.ENTREGADO_A_PAQUETERIA, count: 5, minAge: 0, maxAge: 1 },
  { status: ShipmentStatusCode.EN_TRANSITO, count: 10, minAge: 1, maxAge: 3 },
  { status: ShipmentStatusCode.EN_RUTA, count: 6, minAge: 1, maxAge: 3 },
  { status: ShipmentStatusCode.CLIENTE_NO_RECIBIO, count: 1, minAge: 2, maxAge: 4 },
  { status: ShipmentStatusCode.REINTENTO, count: 2, minAge: 2, maxAge: 5 },
  { status: ShipmentStatusCode.RECHAZADO, count: 4, minAge: 2, maxAge: 8 },
  { status: ShipmentStatusCode.EN_RETORNO, count: 5, minAge: 3, maxAge: 10 },
  { status: ShipmentStatusCode.RECIBIDO_EN_BODEGA, count: 6, minAge: 6, maxAge: 30 },
  { status: ShipmentStatusCode.INCIDENCIA, count: 4, minAge: 2, maxAge: 10 },
  { status: ShipmentStatusCode.EN_ESPERA, count: 1, minAge: 4, maxAge: 12 },
  { status: ShipmentStatusCode.ENTREGADO, count: 68, minAge: 0, maxAge: 45 },
];

const shipments: Shipment[] = [];
const history: ShipmentHistory[] = [];
let trackingSeq = 0;

function addHistory(shipmentId: string, entry: Omit<ShipmentHistory, 'id' | 'shipmentId'>) {
  history.push({ id: id('hist'), shipmentId, ...entry });
}

function statusStep(shipmentId: string, from: string | null, to: string, when: Date, userId: string, comment: string | null) {
  addHistory(shipmentId, { type: HistoryEntryType.STATUS, fromStatus: from, toStatus: to, occurredAt: iso(when), userId, comment });
}

const opUser = () => pick(['usr_operador', 'usr_operador', 'usr_admin']);
const carrierComments: Record<string, string[]> = {
  [ShipmentStatusCode.EN_TRANSITO]: ['Ingresado a centro de distribución', 'Salió de agencia origen', 'En camino a agencia destino'],
  [ShipmentStatusCode.EN_RUTA]: ['Asignado a ruta de reparto', 'Repartidor en camino', 'Salida a ruta'],
  [ShipmentStatusCode.ENTREGADO]: ['Entregado al cliente', 'Recibido por el cliente', 'Entregado en dirección indicada', 'Recibió familiar del cliente'],
  [ShipmentStatusCode.CLIENTE_NO_RECIBIO]: ['Cliente no se encontraba', 'No contestó llamadas', 'Dirección cerrada'],
  [ShipmentStatusCode.RECHAZADO]: ['Cliente rechazó el paquete', 'Cliente indica que ya no lo desea', 'Cliente no tenía el efectivo'],
};

for (const plan of STATUS_PLAN) {
  for (let i = 0; i < plan.count; i++) {
    const carrier = pickCarrier();
    const customer = pick(customers);
    const shipmentId = id('shp');
    trackingSeq += 1;
    const age = plan.status === ShipmentStatusCode.ENTREGADO ? Math.round(int(plan.minAge, plan.maxAge) * (0.4 + rnd() * 0.6)) : int(plan.minAge, plan.maxAge);
    const createdAt = at(age, int(8, 11));

    // Productos
    const lines = int(1, 3);
    const prodLines = Array.from({ length: lines }, () => {
      const p = pick(products);
      return { id: id('sp'), shipmentId, productId: p.id, name: p.name, quantity: chance(0.8) ? 1 : 2, unitPrice: p.price };
    });
    const itemsCount = prodLines.reduce((a, p) => a + p.quantity, 0);
    const productValue = money(prodLines.reduce((a, p) => a + p.quantity * p.unitPrice, 0));
    const shippingCost = customer.department === 'Guatemala' ? pick([25, 30, 35]) : pick([40, 45, 55, 65]);
    const paymentType = rnd() < 0.76 ? PaymentType.CONTRA_ENTREGA : chance(0.6) ? PaymentType.PREPAGADO : PaymentType.TRANSFERENCIA;
    const amountToCollect = paymentType === PaymentType.CONTRA_ENTREGA ? money(productValue + (chance(0.5) ? shippingCost : 0)) : 0;

    const shipment: Shipment = {
      id: shipmentId,
      trackingNumber: `TC-${String(NOW.getFullYear()).slice(-2)}-${String(trackingSeq).padStart(5, '0')}`,
      carrierGuideNumber: null,
      carrierId: carrier.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      address: customer.address,
      department: customer.department,
      municipality: customer.municipality,
      description: `${pick(DESCRIPTIONS)} - ${prodLines.map((p) => p.name).join(', ')}`,
      itemsCount,
      productValue,
      amountToCollect,
      shippingCost,
      paymentType,
      status: plan.status,
      financialStatus: amountToCollect > 0 ? FinancialStatus.PENDIENTE : FinancialStatus.NO_APLICA,
      assignedUserId: opUser(),
      notes: chance(0.25) ? pick(['Llamar antes de entregar', 'Entregar en horario de oficina', 'Cliente frecuente', 'Frágil, manejar con cuidado', 'Portón negro, segunda casa']) : null,
      deliveredToCarrierAt: null,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      returnedAt: null,
      settlementId: null,
      products: prodLines,
      coordinates: null,
      attachments: [],
      createdAt: iso(createdAt),
      updatedAt: iso(createdAt),
    };

    // Construir línea de tiempo
    let t = createdAt;
    let last: string | null = null;
    const step = (to: ShipmentStatusCode, when: Date, userId: string, comment: string | null) => {
      statusStep(shipmentId, last, to, when, userId, comment);
      last = to;
      t = when;
      shipment.updatedAt = iso(when);
    };
    step(ShipmentStatusCode.NUEVO, createdAt, shipment.assignedUserId!, 'Envío creado');
    const path = buildPath(plan.status);
    for (const st of path.slice(1)) {
      let when: Date;
      let user = 'usr_bodega';
      let comment: string | null = null;
      switch (st) {
        case ShipmentStatusCode.PREPARADO:
          when = addHours(t, int(1, 3));
          comment = 'Preparado en bodega';
          break;
        case ShipmentStatusCode.ENTREGADO_A_PAQUETERIA:
          when = t.getHours() >= 15 ? at(daysAgoOf(t) - 1, int(8, 10)) : addHours(t, int(1, 3));
          if (when.getTime() > NOW.getTime()) when = addHours(t, 1);
          shipment.deliveredToCarrierAt = iso(when);
          shipment.carrierGuideNumber = `${guidePrefix[carrier.id]}-${int(1000000, 9999999)}`;
          shipment.estimatedDeliveryAt = iso(addHours(when, customer.department === 'Guatemala' ? 24 : 48));
          comment = `Entregado a ${carrier.name}`;
          break;
        case ShipmentStatusCode.EN_TRANSITO:
          when = addHours(t, int(3, 8));
          user = 'usr_operador';
          comment = pick(carrierComments[st]);
          break;
        case ShipmentStatusCode.EN_RUTA:
          when = nextMorning(t, 7, 9);
          user = 'usr_operador';
          comment = pick(carrierComments[st]);
          break;
        case ShipmentStatusCode.ENTREGADO:
          when = addHours(t, int(2, 8));
          user = 'usr_operador';
          comment = pick(carrierComments[st]);
          shipment.deliveredAt = iso(when);
          break;
        case ShipmentStatusCode.CLIENTE_NO_RECIBIO:
          when = addHours(t, int(2, 7));
          user = 'usr_operador';
          comment = pick(carrierComments[st]);
          break;
        case ShipmentStatusCode.REINTENTO:
          when = addHours(t, int(1, 4));
          user = 'usr_operador';
          comment = 'Se programó reintento con el cliente';
          break;
        case ShipmentStatusCode.RECHAZADO:
          when = addHours(t, int(2, 6));
          user = 'usr_operador';
          comment = pick(carrierComments[st]);
          break;
        case ShipmentStatusCode.EN_RETORNO:
          when = nextMorning(t, 8, 11);
          user = 'usr_operador';
          comment = 'La paquetería inició el retorno';
          break;
        case ShipmentStatusCode.RECIBIDO_EN_BODEGA:
          when = addHours(nextMorning(t, 9, 12), 24 * int(0, 2));
          comment = 'Paquete recibido de vuelta en bodega';
          shipment.returnedAt = iso(when);
          break;
        case ShipmentStatusCode.INCIDENCIA:
          when = addHours(t, int(2, 10));
          user = 'usr_operador';
          comment = 'Se registró una incidencia';
          break;
        case ShipmentStatusCode.EN_ESPERA:
          when = addHours(t, int(4, 20));
          user = 'usr_operador';
          comment = 'En espera de respuesta del cliente';
          break;
        default:
          when = addHours(t, 1);
      }
      if (when.getTime() > NOW.getTime()) when = new Date(Math.min(NOW.getTime() - 60_000, t.getTime() + 30 * 60_000));
      step(st, when, user, comment);
    }

    // Estado financiero
    if (shipment.status === ShipmentStatusCode.ENTREGADO) {
      if (amountToCollect > 0) {
        shipment.financialStatus = FinancialStatus.POR_LIQUIDAR;
        addHistory(shipmentId, {
          type: HistoryEntryType.FINANCIAL,
          fromStatus: FinancialStatus.PENDIENTE,
          toStatus: FinancialStatus.POR_LIQUIDAR,
          occurredAt: iso(addHours(new Date(shipment.deliveredAt!), 0.2)),
          userId: null,
          comment: `Entregado: Q${amountToCollect.toFixed(2)} pendientes de recibir de la paquetería`,
        });
      }
    } else if (RETURN_STATUSES.includes(shipment.status)) {
      shipment.financialStatus = FinancialStatus.NO_APLICA;
    }
    shipments.push(shipment);
  }
}

// Clientes problemáticos: reasignar algunos rechazos a ellos
for (const s of shipments.filter((x) => (x.status === ShipmentStatusCode.RECHAZADO || x.status === ShipmentStatusCode.RECIBIDO_EN_BODEGA))) {
  if (chance(0.5)) {
    const chosen = pick([...troubleCustomers]);
    const c = customers.find((x) => x.id === chosen)!;
    Object.assign(s, { customerId: c.id, customerName: c.name, customerPhone: c.phone, address: c.address, department: c.department, municipality: c.municipality });
  }
}

function daysAgoOf(d: Date) {
  const a = new Date(NOW);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
function nextMorning(t: Date, h1: number, h2: number) {
  const d = new Date(t);
  d.setDate(d.getDate() + 1);
  d.setHours(int(h1, h2), int(0, 59), 0, 0);
  return d;
}
function buildPath(final: ShipmentStatusCode): ShipmentStatusCode[] {
  const S = ShipmentStatusCode;
  const toCarrier = [S.NUEVO, S.PREPARADO, S.ENTREGADO_A_PAQUETERIA];
  const transit = [...toCarrier, S.EN_TRANSITO];
  const route = [...transit, S.EN_RUTA];
  switch (final) {
    case S.NUEVO: return [S.NUEVO];
    case S.PREPARADO: return [S.NUEVO, S.PREPARADO];
    case S.ENTREGADO_A_PAQUETERIA: return toCarrier;
    case S.EN_TRANSITO: return transit;
    case S.EN_RUTA: return route;
    case S.ENTREGADO: return chance(0.15) ? [...route, S.CLIENTE_NO_RECIBIO, S.REINTENTO, S.ENTREGADO] : [...route, S.ENTREGADO];
    case S.CLIENTE_NO_RECIBIO: return [...route, S.CLIENTE_NO_RECIBIO];
    case S.REINTENTO: return [...route, S.CLIENTE_NO_RECIBIO, S.REINTENTO];
    case S.RECHAZADO: return [...route, S.RECHAZADO];
    case S.EN_RETORNO: return [...route, S.RECHAZADO, S.EN_RETORNO];
    case S.RECIBIDO_EN_BODEGA: return [...route, S.RECHAZADO, S.EN_RETORNO, S.RECIBIDO_EN_BODEGA];
    case S.INCIDENCIA: return chance(0.5) ? [...transit, S.INCIDENCIA] : [...route, S.CLIENTE_NO_RECIBIO, S.INCIDENCIA];
    case S.EN_ESPERA: return [...transit, S.INCIDENCIA, S.EN_ESPERA];
    default: return [S.NUEVO];
  }
}

// ---------- Liquidaciones ----------
const settlements: Settlement[] = [];
const settlementDetails: SettlementDetail[] = [];
const payments: Payment[] = [];
let settlementSeq = 0;

const settleCandidates = shipments.filter((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR && daysAgoOf(new Date(s.deliveredAt!)) >= 9);
for (const carrier of carriers) {
  const own = settleCandidates.filter((s) => s.carrierId === carrier.id).sort((a, b) => a.deliveredAt!.localeCompare(b.deliveredAt!));
  if (!own.length) continue;
  const batches = carrier.id === 'car_interna' ? 1 : carrier.id === 'car_cargoexpress' ? 3 : 2;
  const size = Math.ceil(own.length / batches);
  for (let b = 0; b < batches; b++) {
    const group = own.slice(b * size, (b + 1) * size);
    if (!group.length) continue;
    const lastDelivered = new Date(group[group.length - 1].deliveredAt!);
    const date = addHours(lastDelivered, 24 * int(2, 4));
    const isPending = carrier.id === 'car_cargoexpress' && b === batches - 1;
    const hasAdjustment = carrier.id === 'car_guatex' && b === 0;
    const totalCollected = money(group.reduce((a, s) => a + s.amountToCollect, 0));
    const totalAmount = hasAdjustment ? money(totalCollected - 120) : totalCollected;
    const adjustment = money(totalAmount - totalCollected);
    settlementSeq += 1;
    const settlement: Settlement = {
      id: id('stl'),
      number: `LQ-${String(settlementSeq).padStart(5, '0')}`,
      carrierId: carrier.id,
      date: iso(date),
      status: isPending ? SettlementStatus.PENDIENTE : SettlementStatus.CONFIRMADA,
      shipmentsCount: group.length,
      totalCollected,
      totalAmount,
      adjustment,
      reference: isPending ? null : `${pick(['DEP', 'TRF'])}-${int(100000, 999999)}`,
      notes: hasAdjustment ? 'La paquetería descontó Q120 por un paquete con cobro parcial. Pendiente de reclamo.' : isPending ? 'Reporte recibido, esperando confirmación del depósito.' : null,
      createdByUserId: 'usr_conta',
      confirmedAt: isPending ? null : iso(addHours(date, 2)),
      createdAt: iso(date),
      updatedAt: iso(isPending ? date : addHours(date, 2)),
    };
    settlements.push(settlement);
    if (!isPending) {
      payments.push({
        id: id('pay'),
        settlementId: settlement.id,
        method: pick([PaymentMethod.DEPOSITO, PaymentMethod.TRANSFERENCIA]),
        reference: settlement.reference,
        bankName: pick(['Banco Industrial', 'Banrural', 'BAM', 'G&T Continental']),
        amount: totalAmount,
        paidAt: iso(date),
        createdAt: iso(date),
        updatedAt: iso(date),
      });
    }
    for (const s of group) {
      const share = totalCollected > 0 ? money((s.amountToCollect / totalCollected) * adjustment) : 0;
      settlementDetails.push({ id: id('std'), settlementId: settlement.id, shipmentId: s.id, amountCollected: s.amountToCollect, amountSettled: money(s.amountToCollect + share), adjustment: share, note: null });
      s.settlementId = settlement.id;
      if (isPending) {
        addHistory(s.id, { type: HistoryEntryType.SETTLEMENT, fromStatus: null, toStatus: null, occurredAt: iso(date), userId: 'usr_conta', comment: `Incluido en liquidación ${settlement.number} (pendiente de confirmar)`, metadata: { settlementId: settlement.id } });
      } else {
        const newStatus = adjustment !== 0 ? FinancialStatus.AJUSTE : FinancialStatus.LIQUIDADO;
        addHistory(s.id, { type: HistoryEntryType.FINANCIAL, fromStatus: FinancialStatus.POR_LIQUIDAR, toStatus: newStatus, occurredAt: iso(addHours(date, 2)), userId: 'usr_conta', comment: `Liquidado en ${settlement.number}${adjustment !== 0 ? ' con ajuste' : ''}`, metadata: { settlementId: settlement.id } });
        s.financialStatus = newStatus;
        s.updatedAt = iso(addHours(date, 2));
      }
    }
  }
}

// ---------- Incidencias ----------
const incidents: ShipmentIncident[] = [];
const incidentTexts: Record<IncidentType, string[]> = {
  [IncidentType.DIRECCION_INCORRECTA]: ['La dirección no existe según el repartidor; se solicitó nueva referencia al cliente.', 'El cliente indicó una zona diferente a la registrada.'],
  [IncidentType.CLIENTE_NO_RESPONDE]: ['Se llamó 3 veces al cliente sin respuesta.', 'WhatsApp sin lectura desde hace dos días.'],
  [IncidentType.CLIENTE_RECHAZO]: ['El cliente rechazó el paquete al no tener efectivo.', 'Cliente indicó que ya compró el producto en otro lugar.'],
  [IncidentType.PAQUETE_DANADO]: ['El paquete llegó con la caja golpeada; el cliente reclama el producto dañado.', 'Se reporta empaque roto en centro de distribución.'],
  [IncidentType.PAQUETE_PERDIDO]: ['La paquetería no localiza el paquete en su bodega.', 'Guía sin movimientos desde hace 5 días.'],
  [IncidentType.PROBLEMA_PAQUETERIA]: ['La paquetería registró el paquete con guía equivocada.', 'Retraso por unidad averiada según la paquetería.'],
  [IncidentType.PAGO_INCORRECTO]: ['La paquetería reporta un cobro menor al monto del envío.', 'El repartidor cobró Q50 menos de lo indicado.'],
  [IncidentType.OTRO]: ['El cliente solicita cambiar la fecha de entrega.', 'Se solicita reprogramar por viaje del cliente.'],
};
function addIncident(s: Shipment, type: IncidentType, status: IncidentStatus, daysAfterCreated: number, resolution: string | null) {
  const created = addHours(new Date(s.createdAt), 24 * daysAfterCreated + int(1, 6));
  const resolvedAt = status === IncidentStatus.RESUELTA ? addHours(created, int(6, 48)) : null;
  const incident: ShipmentIncident = {
    id: id('inc'),
    shipmentId: s.id,
    type,
    description: pick(incidentTexts[type]),
    status,
    reportedByUserId: pick(['usr_operador', 'usr_bodega']),
    assignedUserId: status === IncidentStatus.ABIERTA ? null : pick(['usr_operador', 'usr_admin']),
    resolution,
    resolvedAt: resolvedAt ? iso(resolvedAt) : null,
    createdAt: iso(created),
    updatedAt: iso(resolvedAt ?? created),
  };
  incidents.push(incident);
  addHistory(s.id, { type: HistoryEntryType.INCIDENT, fromStatus: null, toStatus: null, occurredAt: iso(created), userId: incident.reportedByUserId, comment: `Incidencia registrada: ${incident.description}`, metadata: { incidentId: incident.id, incidentType: type } });
  if (resolvedAt) {
    addHistory(s.id, { type: HistoryEntryType.INCIDENT, fromStatus: IncidentStatus.EN_REVISION, toStatus: IncidentStatus.RESUELTA, occurredAt: iso(resolvedAt), userId: incident.assignedUserId, comment: `Incidencia resuelta: ${resolution}`, metadata: { incidentId: incident.id } });
  }
}
const openTypes = [IncidentType.DIRECCION_INCORRECTA, IncidentType.CLIENTE_NO_RESPONDE, IncidentType.PAQUETE_DANADO, IncidentType.PAQUETE_PERDIDO, IncidentType.PROBLEMA_PAQUETERIA];
shipments
  .filter((s) => s.status === ShipmentStatusCode.INCIDENCIA || s.status === ShipmentStatusCode.EN_ESPERA)
  .forEach((s, i) => addIncident(s, openTypes[i % openTypes.length], i % 2 === 0 ? IncidentStatus.ABIERTA : IncidentStatus.EN_REVISION, 1, null));
// Disputa financiera sobre un paquete entregado
const disputed = shipments.find((s) => s.financialStatus === FinancialStatus.POR_LIQUIDAR && !s.settlementId && s.carrierId === 'car_forza');
if (disputed) {
  addIncident(disputed, IncidentType.PAGO_INCORRECTO, IncidentStatus.EN_REVISION, 1, null);
  disputed.financialStatus = FinancialStatus.DISPUTA;
  addHistory(disputed.id, { type: HistoryEntryType.FINANCIAL, fromStatus: FinancialStatus.POR_LIQUIDAR, toStatus: FinancialStatus.DISPUTA, occurredAt: iso(addHours(new Date(disputed.deliveredAt!), 30)), userId: 'usr_conta', comment: 'Disputa por pago incorrecto' });
}
// Resueltas
const resolvedPool = shipments.filter((s) => (s.status === ShipmentStatusCode.ENTREGADO || s.status === ShipmentStatusCode.RECIBIDO_EN_BODEGA) && daysAgoOf(new Date(s.createdAt)) > 6);
const resolvedSpecs: [IncidentType, string][] = [
  [IncidentType.DIRECCION_INCORRECTA, 'Cliente envió ubicación por WhatsApp; se entregó al día siguiente.'],
  [IncidentType.CLIENTE_NO_RESPONDE, 'Cliente respondió y confirmó entrega en su trabajo.'],
  [IncidentType.CLIENTE_RECHAZO, 'Paquete devuelto a bodega y reingresado a inventario.'],
  [IncidentType.OTRO, 'Se reprogramó la entrega para la fecha solicitada.'],
  [IncidentType.PROBLEMA_PAQUETERIA, 'La paquetería corrigió la guía y reanudó el envío.'],
  [IncidentType.PAQUETE_DANADO, 'Se envió reposición sin costo; la paquetería reconoció el daño.'],
];
resolvedSpecs.forEach(([type, res], i) => {
  const s = resolvedPool[(i * 7) % resolvedPool.length];
  if (s) addIncident(s, type, IncidentStatus.RESUELTA, 1, res);
});

// ---------- Notas sueltas ----------
for (const s of shipments.filter(() => chance(0.12))) {
  addHistory(s.id, { type: HistoryEntryType.NOTE, fromStatus: null, toStatus: null, occurredAt: iso(addHours(new Date(s.createdAt), int(1, 30))), userId: opUser(), comment: pick(['Cliente confirmó dirección por WhatsApp', 'Se envió tracking al cliente', 'Cliente pidió entregar después de las 2 pm', 'Se verificó teléfono del cliente']) });
}

// ---------- Escritura ----------
const statuses = DEFAULT_SHIPMENT_STATUSES.map((s) => ({ id: s.code, ...s }));
const files: Record<string, unknown> = {
  'meta.json': { generatedAt: iso(NOW), version: 1 },
  'users.json': users,
  'carriers.json': carriers,
  'customers.json': customers,
  'products.json': products,
  'shipment-statuses.json': statuses,
  'shipments.json': shipments,
  'shipment-history.json': history.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  'incidents.json': incidents,
  'settlements.json': settlements,
  'settlement-details.json': settlementDetails,
  'payments.json': payments,
};
fs.mkdirSync(env.seedDir, { recursive: true });
for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(env.seedDir, name), JSON.stringify(content, null, 2));
if (fs.existsSync(env.runtimeDir)) fs.rmSync(env.runtimeDir, { recursive: true, force: true });

const count = (st: string) => shipments.filter((s) => s.status === st).length;
console.log(`Seed generado en ${env.seedDir}`);
console.log(`  Envíos: ${shipments.length} | Entregados: ${count('ENTREGADO')} | Liquidados: ${shipments.filter((s) => s.financialStatus === 'LIQUIDADO' || s.financialStatus === 'AJUSTE').length} | Por liquidar: ${shipments.filter((s) => s.financialStatus === 'POR_LIQUIDAR').length}`);
console.log(`  Clientes: ${customers.length} | Paqueterías: ${carriers.length} | Incidencias: ${incidents.length} | Liquidaciones: ${settlements.length} | Historial: ${history.length}`);

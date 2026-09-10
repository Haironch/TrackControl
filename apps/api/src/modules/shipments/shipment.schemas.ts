import { z } from 'zod';
import { FinancialStatus, PaymentType, StatusCategory } from '@trackcontrol/shared';

const enumValues = <T extends Record<string, string>>(obj: T) => Object.values(obj) as [T[keyof T], ...T[keyof T][]];

export const shipmentProductSchema = z.object({
  productId: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

export const createShipmentSchema = z.object({
  carrierId: z.string().min(1, 'Selecciona una paquetería'),
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(6).max(30),
  address: z.string().min(3).max(250),
  department: z.string().min(2).max(60),
  municipality: z.string().min(2).max(60),
  description: z.string().min(2).max(250),
  products: z.array(shipmentProductSchema).optional(),
  itemsCount: z.coerce.number().int().min(1).optional(),
  productValue: z.coerce.number().min(0),
  amountToCollect: z.coerce.number().min(0),
  shippingCost: z.coerce.number().min(0),
  paymentType: z.enum(enumValues(PaymentType)),
  carrierGuideNumber: z.string().max(60).nullable().optional(),
  estimatedDeliveryAt: z.string().datetime({ offset: true }).nullable().optional().or(z.literal('').transform(() => null)),
  assignedUserId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const changeStatusSchema = z.object({
  status: z.string().min(1),
  comment: z.string().max(500).nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }).nullable().optional(),
  carrierGuideNumber: z.string().max(60).nullable().optional(),
  /** Solo ADMINISTRADOR: permite saltar la validación de transiciones. */
  force: z.boolean().optional(),
});

export const addNoteSchema = z.object({ comment: z.string().min(1).max(500) });

export const shipmentQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.enum(enumValues(StatusCategory)).optional(),
  carrierId: z.string().optional(),
  customerId: z.string().optional(),
  department: z.string().optional(),
  financialStatus: z.enum(enumValues(FinancialStatus)).optional(),
  paymentType: z.enum(enumValues(PaymentType)).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'amountToCollect', 'customerName', 'status', 'trackingNumber', 'deliveredAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const idParams = z.object({ id: z.string().min(1) });

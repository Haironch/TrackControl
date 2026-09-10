import { Router } from 'express';
import { z } from 'zod';
import { PaymentMethod, SettlementStatus } from '@trackcontrol/shared';
import { created, ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { getCurrentUser, requirePermission } from '../auth/auth.middleware';
import type { SettlementService } from './settlement.service';

const enumValues = <T extends Record<string, string>>(obj: T) => Object.values(obj) as [T[keyof T], ...T[keyof T][]];
const idParams = z.object({ id: z.string().min(1) });

const createBody = z.object({
  carrierId: z.string().min(1),
  date: z.string().min(10),
  shipmentIds: z.array(z.string().min(1)).min(1),
  totalAmount: z.coerce.number().min(0).optional(),
  reference: z.string().max(80).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  confirm: z.boolean().optional(),
  payment: z
    .object({
      method: z.enum(enumValues(PaymentMethod)),
      reference: z.string().max(80).nullable().optional(),
      bankName: z.string().max(80).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export function createSettlementRouter(service: SettlementService) {
  const router = Router();
  router.get(
    '/',
    validate({ query: z.object({ carrierId: z.string().optional(), status: z.enum(enumValues(SettlementStatus)).optional() }) }),
    async (_req, res) => ok(res, await service.list(res.locals.query)),
  );
  router.get('/summary', async (_req, res) => ok(res, await service.summaryByCarrier()));
  router.get('/pending-shipments', validate({ query: z.object({ carrierId: z.string().optional() }) }), async (_req, res) =>
    ok(res, await service.pendingShipments(res.locals.query.carrierId)),
  );
  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.get(res.locals.params.id)));
  router.post('/', requirePermission('settlements:write'), validate({ body: createBody }), async (_req, res) =>
    created(res, await service.create(res.locals.body, getCurrentUser(res))),
  );
  router.patch('/:id/confirm', requirePermission('settlements:write'), validate({ params: idParams }), async (_req, res) =>
    ok(res, await service.confirm(res.locals.params.id, getCurrentUser(res))),
  );
  router.patch('/:id/cancel', requirePermission('settlements:write'), validate({ params: idParams }), async (_req, res) =>
    ok(res, await service.cancel(res.locals.params.id, getCurrentUser(res))),
  );
  return router;
}

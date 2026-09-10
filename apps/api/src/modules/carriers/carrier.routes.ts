import { Router } from 'express';
import { z } from 'zod';
import { created, ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { requirePermission } from '../auth/auth.middleware';
import type { CarrierService } from './carrier.service';

const idParams = z.object({ id: z.string().min(1) });
const carrierBody = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(8).optional(),
  phone: z.string().min(6).max(30),
  contactName: z.string().min(2).max(80),
  email: z.string().email().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido'),
  active: z.boolean().optional(),
});

export function createCarrierRouter(service: CarrierService) {
  const router = Router();
  router.get('/', async (_req, res) => ok(res, await service.list()));
  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.get(res.locals.params.id)));
  router.post('/', requirePermission('carriers:write'), validate({ body: carrierBody }), async (_req, res) =>
    created(res, await service.create(res.locals.body)),
  );
  router.put('/:id', requirePermission('carriers:write'), validate({ params: idParams, body: carrierBody.partial() }), async (_req, res) =>
    ok(res, await service.update(res.locals.params.id, res.locals.body)),
  );
  router.patch('/:id/toggle-active', requirePermission('carriers:write'), validate({ params: idParams }), async (_req, res) =>
    ok(res, await service.toggleActive(res.locals.params.id)),
  );
  return router;
}

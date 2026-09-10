import { Router } from 'express';
import { z } from 'zod';
import { created, ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { requirePermission } from '../auth/auth.middleware';
import type { CustomerService } from './customer.service';

const idParams = z.object({ id: z.string().min(1) });
const customerBody = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  address: z.string().min(3).max(250),
  department: z.string().min(2).max(60),
  municipality: z.string().min(2).max(60),
  email: z.string().email().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export function createCustomerRouter(service: CustomerService) {
  const router = Router();
  router.get('/', validate({ query: z.object({ search: z.string().optional() }) }), async (_req, res) =>
    ok(res, await service.list(res.locals.query.search)),
  );
  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.get(res.locals.params.id)));
  router.post('/', requirePermission('customers:write'), validate({ body: customerBody }), async (_req, res) =>
    created(res, await service.create(res.locals.body)),
  );
  router.put('/:id', requirePermission('customers:write'), validate({ params: idParams, body: customerBody.partial() }), async (_req, res) =>
    ok(res, await service.update(res.locals.params.id, res.locals.body)),
  );
  return router;
}

import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { requirePermission } from '../auth/auth.middleware';
import type { UserService } from './user.service';

const idParams = z.object({ id: z.string().min(1) });

export function createUserRouter(service: UserService) {
  const router = Router();
  router.get('/', async (_req, res) => ok(res, await service.list()));
  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.get(res.locals.params.id)));
  router.patch('/:id/toggle-active', requirePermission('users:write'), validate({ params: idParams }), async (_req, res) =>
    ok(res, await service.toggleActive(res.locals.params.id)),
  );
  return router;
}

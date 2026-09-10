import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import type { DashboardService } from './dashboard.service';

export function createDashboardRouter(service: DashboardService) {
  const router = Router();
  router.get('/summary', async (_req, res) => ok(res, await service.summary()));
  router.get('/statistics', validate({ query: z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }) }), async (_req, res) =>
    ok(res, await service.statistics(res.locals.query.days)),
  );
  router.get('/activity', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(12) }) }), async (_req, res) =>
    ok(res, await service.activity(res.locals.query.limit)),
  );
  return router;
}

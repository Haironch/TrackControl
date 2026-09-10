import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error';
import { ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { requirePermission } from '../auth/auth.middleware';
import type { ReportService } from './report.service';

const reportQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  carrierId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
});

export function createReportRouter(service: ReportService) {
  const router = Router();
  router.get('/', (_req, res) => ok(res, service.definitions()));
  router.get('/:id', requirePermission('reports:read'), validate({ params: z.object({ id: z.string() }), query: reportQuery }), async (_req, res) =>
    ok(res, await service.generate(res.locals.params.id, res.locals.query)),
  );
  // Exportaciones previstas: la arquitectura ya recibe el formato; la generación se implementará después.
  router.get('/:id/export/:format', requirePermission('reports:read'), validate({ params: z.object({ id: z.string(), format: z.enum(['xlsx', 'pdf']) }) }), (_req, res) => {
    throw new AppError(501, 'NOT_IMPLEMENTED', `La exportación a ${res.locals.params.format.toUpperCase()} estará disponible próximamente.`);
  });
  return router;
}

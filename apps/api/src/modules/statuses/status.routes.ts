import { Router } from 'express';
import { FINANCIAL_STATUS_META, STATUS_CATEGORY_META } from '@trackcontrol/shared';
import { ok } from '../../core/http/respond';
import type { StatusService } from './status.service';

export function createStatusRouter(service: StatusService) {
  const router = Router();
  router.get('/', async (_req, res) => ok(res, await service.catalog()));
  router.get('/meta', async (_req, res) =>
    ok(res, { financial: FINANCIAL_STATUS_META, categories: STATUS_CATEGORY_META }),
  );
  return router;
}

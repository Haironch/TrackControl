import { Router } from 'express';
import { z } from 'zod';
import { created, ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { getCurrentUser, requirePermission } from '../auth/auth.middleware';
import type { ShipmentService } from './shipment.service';
import { addNoteSchema, changeStatusSchema, createShipmentSchema, idParams, shipmentQuerySchema, updateShipmentSchema } from './shipment.schemas';

export function createShipmentRouter(service: ShipmentService) {
  const router = Router();

  router.get('/', validate({ query: shipmentQuerySchema }), async (_req, res) => {
    const result = await service.list(res.locals.query);
    ok(res, result.data, result.meta);
  });

  router.get('/facets', async (_req, res) => ok(res, await service.facets()));

  router.get('/tracking/:tracking', validate({ params: z.object({ tracking: z.string().min(3) }) }), async (_req, res) =>
    ok(res, await service.findByTracking(res.locals.params.tracking)),
  );

  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.getDetail(res.locals.params.id)));

  router.get('/:id/history', validate({ params: idParams }), async (_req, res) => ok(res, await service.history(res.locals.params.id)));

  router.post('/', requirePermission('shipments:create'), validate({ body: createShipmentSchema }), async (_req, res) =>
    created(res, await service.create(res.locals.body, getCurrentUser(res))),
  );

  router.put('/:id', requirePermission('shipments:update'), validate({ params: idParams, body: updateShipmentSchema }), async (_req, res) =>
    ok(res, await service.update(res.locals.params.id, res.locals.body, getCurrentUser(res))),
  );

  router.patch('/:id/status', requirePermission('shipments:change-status'), validate({ params: idParams, body: changeStatusSchema }), async (_req, res) =>
    ok(res, await service.changeStatus(res.locals.params.id, res.locals.body, getCurrentUser(res))),
  );

  router.post('/:id/notes', requirePermission('shipments:read'), validate({ params: idParams, body: addNoteSchema }), async (_req, res) =>
    created(res, await service.addNote(res.locals.params.id, res.locals.body.comment, getCurrentUser(res))),
  );

  return router;
}

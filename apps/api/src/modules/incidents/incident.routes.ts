import { Router } from 'express';
import { z } from 'zod';
import { IncidentStatus, IncidentType } from '@trackcontrol/shared';
import { created, ok } from '../../core/http/respond';
import { validate } from '../../core/http/validate';
import { getCurrentUser, requirePermission } from '../auth/auth.middleware';
import type { IncidentService } from './incident.service';

const enumValues = <T extends Record<string, string>>(obj: T) => Object.values(obj) as [T[keyof T], ...T[keyof T][]];
const idParams = z.object({ id: z.string().min(1) });

const createBody = z.object({
  shipmentId: z.string().min(1),
  type: z.enum(enumValues(IncidentType)),
  description: z.string().min(3).max(1000),
  assignedUserId: z.string().nullable().optional(),
  moveShipmentToIncident: z.boolean().optional(),
});

const updateBody = z.object({
  status: z.enum(enumValues(IncidentStatus)).optional(),
  resolution: z.string().max(1000).nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
  description: z.string().min(3).max(1000).optional(),
});

const listQuery = z.object({
  status: z.enum(enumValues(IncidentStatus)).optional(),
  type: z.enum(enumValues(IncidentType)).optional(),
  shipmentId: z.string().optional(),
});

export function createIncidentRouter(service: IncidentService) {
  const router = Router();
  router.get('/', validate({ query: listQuery }), async (_req, res) => ok(res, await service.list(res.locals.query)));
  router.get('/:id', validate({ params: idParams }), async (_req, res) => ok(res, await service.get(res.locals.params.id)));
  router.post('/', requirePermission('incidents:write'), validate({ body: createBody }), async (_req, res) =>
    created(res, await service.create(res.locals.body, getCurrentUser(res))),
  );
  router.patch('/:id', requirePermission('incidents:write'), validate({ params: idParams, body: updateBody }), async (_req, res) =>
    ok(res, await service.update(res.locals.params.id, res.locals.body, getCurrentUser(res))),
  );
  return router;
}

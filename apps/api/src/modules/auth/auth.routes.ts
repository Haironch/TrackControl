import { Router } from 'express';
import { ROLE_PERMISSIONS, type UserRole } from '@trackcontrol/shared';
import { ok } from '../../core/http/respond';
import { getCurrentUser } from './auth.middleware';

export function createAuthRouter() {
  const router = Router();
  router.get('/me', (_req, res) => {
    const user = getCurrentUser(res);
    ok(res, { user, permissions: ROLE_PERMISSIONS[user.role as UserRole] ?? [] });
  });
  return router;
}

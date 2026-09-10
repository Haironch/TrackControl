import type { RequestHandler } from 'express';
import { hasPermission, type User, type UserRole } from '@trackcontrol/shared';
import { AppError, ForbiddenError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';

declare global {
  namespace Express {
    interface Locals {
      currentUser?: User;
    }
  }
}

/**
 * Autenticación simulada: el usuario activo viaja en el header `x-user-id`.
 * Cuando se implemente autenticación real (JWT / sesión) solo cambia este middleware;
 * el resto de la app sigue leyendo `res.locals.currentUser`.
 */
export function currentUserMiddleware(repos: Repositories): RequestHandler {
  return async (req, res, next) => {
    try {
      const headerId = req.header('x-user-id');
      let user: User | null = null;
      if (headerId) user = await repos.users.findById(headerId);
      if (!user) user = (await repos.users.findOne((u) => u.role === 'ADMINISTRADOR' && u.active)) ?? null;
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'No hay un usuario activo.');
      res.locals.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.currentUser;
    if (!user) return next(new AppError(401, 'UNAUTHENTICATED', 'No hay un usuario activo.'));
    if (!hasPermission(user.role as UserRole, permission)) {
      return next(new ForbiddenError(`Tu rol (${user.role}) no tiene el permiso "${permission}".`));
    }
    next();
  };
}

export function getCurrentUser(res: { locals: { currentUser?: User } }): User {
  const user = res.locals.currentUser;
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'No hay un usuario activo.');
  return user;
}

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: `Ruta ${req.method} ${req.originalUrl} no existe.` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es JSON válido.' } });
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
};

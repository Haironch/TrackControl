import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Middleware de validación con Zod. Los valores parseados (con coerciones y defaults)
 * quedan en res.locals.{body,query,params} porque en Express 5 req.query es de solo lectura.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    try {
      if (schemas.body) res.locals.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) res.locals.query = schemas.query.parse(req.query ?? {});
      if (schemas.params) res.locals.params = schemas.params.parse(req.params ?? {});
      next();
    } catch (error) {
      next(error);
    }
  };
}

export type Parsed<T extends ZodTypeAny> = z.infer<T>;

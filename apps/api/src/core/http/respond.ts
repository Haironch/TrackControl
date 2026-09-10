import type { Response } from 'express';

export function ok<T>(res: Response, data: T, meta?: object) {
  res.json(meta ? { data, meta } : { data });
}

export function created<T>(res: Response, data: T) {
  res.status(201).json({ data });
}

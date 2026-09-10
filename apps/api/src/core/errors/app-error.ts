export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(404, 'NOT_FOUND', id ? `${entity} con id "${id}" no existe.` : `${entity} no encontrado.`);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos.', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para esta acción.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'BUSINESS_RULE', message, details);
  }
}

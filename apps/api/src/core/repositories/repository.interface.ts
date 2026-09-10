/**
 * Contrato genérico de repositorio. La lógica de negocio (services) solo conoce
 * esta interfaz, nunca el origen de datos. Para migrar a PostgreSQL basta con
 * crear una implementación (PrismaRepository) que cumpla este contrato.
 */
export interface Identifiable {
  id: string;
}

export type Predicate<T> = (item: T) => boolean;

export interface Repository<T extends Identifiable> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(predicate: Predicate<T>): Promise<T | null>;
  findMany(predicate: Predicate<T>): Promise<T[]>;
  count(predicate?: Predicate<T>): Promise<number>;
  create(item: T): Promise<T>;
  createMany(items: T[]): Promise<T[]>;
  update(id: string, patch: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/** Unidad de trabajo mínima: permite agrupar varias escrituras (transacción en BD). */
export interface UnitOfWork {
  run<R>(work: () => Promise<R>): Promise<R>;
}

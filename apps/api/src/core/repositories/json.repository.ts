import { NotFoundError } from '../errors/app-error';
import type { Identifiable, Predicate, Repository } from './repository.interface';
import type { JsonCollectionStore } from '../persistence/json-data-source';

/**
 * Implementación en memoria respaldada por archivos JSON.
 * Todas las operaciones son asíncronas para que el contrato sea idéntico al de una BD.
 */
export class JsonRepository<T extends Identifiable> implements Repository<T> {
  constructor(
    private readonly entityName: string,
    private readonly store: JsonCollectionStore<T>,
  ) {}

  async findAll(): Promise<T[]> {
    return [...this.store.items];
  }

  async findById(id: string): Promise<T | null> {
    return this.store.items.find((i) => i.id === id) ?? null;
  }

  async findOne(predicate: Predicate<T>): Promise<T | null> {
    return this.store.items.find(predicate) ?? null;
  }

  async findMany(predicate: Predicate<T>): Promise<T[]> {
    return this.store.items.filter(predicate);
  }

  async count(predicate?: Predicate<T>): Promise<number> {
    return predicate ? this.store.items.filter(predicate).length : this.store.items.length;
  }

  async create(item: T): Promise<T> {
    this.store.items.push(item);
    this.store.markDirty();
    return item;
  }

  async createMany(items: T[]): Promise<T[]> {
    this.store.items.push(...items);
    this.store.markDirty();
    return items;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const idx = this.store.items.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundError(this.entityName, id);
    const updated = { ...this.store.items[idx], ...patch, id } as T;
    this.store.items[idx] = updated;
    this.store.markDirty();
    return updated;
  }

  async delete(id: string): Promise<void> {
    const idx = this.store.items.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundError(this.entityName, id);
    this.store.items.splice(idx, 1);
    this.store.markDirty();
  }
}

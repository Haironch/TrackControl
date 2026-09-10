import type { User } from '@trackcontrol/shared';
import { NotFoundError } from '../../core/errors/app-error';
import type { Repositories } from '../../core/persistence/data-source';

export class UserService {
  constructor(private readonly repos: Repositories) {}

  list() {
    return this.repos.users.findAll();
  }

  async get(id: string): Promise<User> {
    const user = await this.repos.users.findById(id);
    if (!user) throw new NotFoundError('Usuario', id);
    return user;
  }

  async toggleActive(id: string) {
    const user = await this.get(id);
    return this.repos.users.update(id, { active: !user.active, updatedAt: new Date().toISOString() });
  }

  async ref(id: string | null | undefined) {
    if (!id) return null;
    const u = await this.repos.users.findById(id);
    return u ? { id: u.id, name: u.name, role: u.role } : null;
  }
}

/**
 * In-Memory User Repository Implementation
 * Infrastructure layer - Implements user data persistence
 */

import { User } from '../../domain/entities/User';
import { UserId } from '../../domain/valueobjects/UserId';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id.getValue(), user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.getValue()) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async delete(id: UserId): Promise<void> {
    this.users.delete(id.getValue());
  }

  async findUsersWithOverdueFees(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.overdueFees > 0);
  }
}

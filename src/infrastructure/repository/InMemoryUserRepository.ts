/**
 * In-Memory User Repository - Infrastructure Layer
 */

import { User } from "../../domain/entity/User";
import { IUserRepository } from "../../domain/repository/IUserRepository";

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (
      Array.from(this.users.values()).find(
        (user) => user.email.toString() === email,
      ) || null
    );
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Helper method for testing
  clear(): void {
    this.users.clear();
  }
}

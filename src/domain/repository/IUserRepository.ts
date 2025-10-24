/**
 * User Repository Interface - Domain Layer
 */

import { User } from "../entity/User";

export interface IUserRepository {
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Delete a user
   */
  delete(id: string): Promise<void>;
}

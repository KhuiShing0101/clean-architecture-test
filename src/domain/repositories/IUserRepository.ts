/**
 * User Repository Interface
 * Domain layer - Defines the contract for user data access
 */

import { User } from '../entities/User';
import { UserId } from '../valueobjects/UserId';

export interface IUserRepository {
  /**
   * Save a user
   */
  save(user: User): Promise<void>;

  /**
   * Find a user by ID
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find all users
   */
  findAll(): Promise<User[]>;

  /**
   * Delete a user
   */
  delete(id: UserId): Promise<void>;

  /**
   * Find users with overdue fees
   */
  findUsersWithOverdueFees(): Promise<User[]>;
}

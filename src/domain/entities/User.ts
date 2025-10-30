/**
 * User Entity
 * Domain layer - Represents a library user with business rules
 */

import { UserId } from '../valueobjects/UserId';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly name: string,
    public readonly email: string,
    public readonly status: UserStatus,
    public readonly currentBorrowCount: number,
    public readonly overdueFees: number,
    public readonly createdAt: Date
  ) {
    this.validate();
  }

  /**
   * Maximum number of books a user can borrow
   */
  static readonly MAX_BORROW_LIMIT = 5;

  /**
   * Factory method to create a new User
   */
  static create(name: string, email: string): User {
    return new User(
      UserId.generate(),
      name,
      email,
      UserStatus.ACTIVE,
      0, // No books borrowed initially
      0, // No overdue fees initially
      new Date()
    );
  }

  /**
   * Recreate User from persistence
   */
  static restore(
    id: UserId,
    name: string,
    email: string,
    status: UserStatus,
    currentBorrowCount: number,
    overdueFees: number,
    createdAt: Date
  ): User {
    return new User(id, name, email, status, currentBorrowCount, overdueFees, createdAt);
  }

  /**
   * Check if user can borrow more books
   */
  canBorrow(): boolean {
    if (this.status === UserStatus.SUSPENDED) {
      return false;
    }

    if (this.currentBorrowCount >= User.MAX_BORROW_LIMIT) {
      return false;
    }

    if (this.overdueFees > 0) {
      return false; // Must pay overdue fees before borrowing
    }

    return true;
  }

  /**
   * Increment borrow count when user borrows a book
   */
  borrowBook(): User {
    if (!this.canBorrow()) {
      throw new Error('User cannot borrow more books');
    }

    return new User(
      this.id,
      this.name,
      this.email,
      this.status,
      this.currentBorrowCount + 1,
      this.overdueFees,
      this.createdAt
    );
  }

  /**
   * Decrement borrow count when user returns a book
   */
  returnBook(overdueFee: number = 0): User {
    if (this.currentBorrowCount <= 0) {
      throw new Error('User has no borrowed books to return');
    }

    return new User(
      this.id,
      this.name,
      this.email,
      this.status,
      this.currentBorrowCount - 1,
      this.overdueFees + overdueFee,
      this.createdAt
    );
  }

  /**
   * Pay overdue fees
   */
  payFees(amount: number): User {
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (amount > this.overdueFees) {
      throw new Error('Payment amount exceeds overdue fees');
    }

    return new User(
      this.id,
      this.name,
      this.email,
      this.status,
      this.currentBorrowCount,
      this.overdueFees - amount,
      this.createdAt
    );
  }

  /**
   * Suspend user account
   */
  suspend(): User {
    return new User(
      this.id,
      this.name,
      this.email,
      UserStatus.SUSPENDED,
      this.currentBorrowCount,
      this.overdueFees,
      this.createdAt
    );
  }

  /**
   * Activate user account
   */
  activate(): User {
    return new User(
      this.id,
      this.name,
      this.email,
      UserStatus.ACTIVE,
      this.currentBorrowCount,
      this.overdueFees,
      this.createdAt
    );
  }

  /**
   * Validate entity state
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('User name cannot be empty');
    }

    if (this.name.length > 100) {
      throw new Error('User name cannot exceed 100 characters');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Invalid email address');
    }

    if (this.currentBorrowCount < 0) {
      throw new Error('Borrow count cannot be negative');
    }

    if (this.currentBorrowCount > User.MAX_BORROW_LIMIT) {
      throw new Error(`Borrow count cannot exceed ${User.MAX_BORROW_LIMIT}`);
    }

    if (this.overdueFees < 0) {
      throw new Error('Overdue fees cannot be negative');
    }
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

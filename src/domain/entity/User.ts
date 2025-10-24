/**
 * User Entity - Lesson 2
 *
 * Domain entity representing a library user.
 * Demonstrates Clean Architecture principles:
 * - Business rules in the domain layer
 * - No infrastructure dependencies
 */

export class User {
  private readonly _borrowedBooks: string[] = []; // Book IDs
  private readonly _maxBorrowLimit = 3;

  constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _email: Email,
    private _status: UserStatus,
  ) {}

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get status(): UserStatus {
    return this._status;
  }

  get borrowedBooks(): readonly string[] {
    return this._borrowedBooks;
  }

  /**
   * Business Rule: User can borrow a book if:
   * 1. User is ACTIVE
   * 2. Under borrow limit
   * 3. Not already borrowed this book
   */
  canBorrow(): boolean {
    return (
      this._status === UserStatus.ACTIVE &&
      this._borrowedBooks.length < this._maxBorrowLimit
    );
  }

  /**
   * Add a borrowed book
   */
  addBorrowedBook(bookId: string): void {
    if (!this.canBorrow()) {
      throw new Error(
        `User ${this._name} cannot borrow more books (limit: ${this._maxBorrowLimit})`,
      );
    }

    if (this._borrowedBooks.includes(bookId)) {
      throw new Error(`User ${this._name} already borrowed this book`);
    }

    this._borrowedBooks.push(bookId);
  }

  /**
   * Return a borrowed book
   */
  returnBook(bookId: string): void {
    const index = this._borrowedBooks.indexOf(bookId);
    if (index === -1) {
      throw new Error(`User ${this._name} has not borrowed this book`);
    }
    this._borrowedBooks.splice(index, 1);
  }

  /**
   * Suspend user account
   */
  suspend(): void {
    this._status = UserStatus.SUSPENDED;
  }

  /**
   * Activate user account
   */
  activate(): void {
    this._status = UserStatus.ACTIVE;
  }
}

/**
 * Email Value Object
 * Encapsulates email validation
 */
export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    this.value = email;
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INACTIVE = "INACTIVE",
}

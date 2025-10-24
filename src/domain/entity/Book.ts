/**
 * Book Entity - Lesson 1
 *
 * Domain entity representing a book in the library system.
 * This follows Clean Architecture principles:
 * - No external dependencies
 * - Pure business logic
 * - Immutable value objects (ISBN)
 */

export class Book {
  constructor(
    private readonly _id: string,
    private readonly _title: string,
    private readonly _isbn: ISBN,
    private _status: BookStatus,
  ) {}

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get isbn(): ISBN {
    return this._isbn;
  }

  get status(): BookStatus {
    return this._status;
  }

  /**
   * Business logic: A book can only be borrowed if it's available
   */
  borrow(): void {
    if (this._status !== BookStatus.AVAILABLE) {
      throw new Error(`Book "${this._title}" is not available for borrowing`);
    }
    this._status = BookStatus.BORROWED;
  }

  /**
   * Business logic: Return a borrowed book
   */
  returnBook(): void {
    if (this._status !== BookStatus.BORROWED) {
      throw new Error(`Book "${this._title}" is not currently borrowed`);
    }
    this._status = BookStatus.AVAILABLE;
  }
}

/**
 * ISBN Value Object
 * Encapsulates ISBN validation logic
 */
export class ISBN {
  private readonly value: string;

  constructor(isbn: string) {
    if (!this.isValid(isbn)) {
      throw new Error(`Invalid ISBN format: ${isbn}`);
    }
    this.value = isbn;
  }

  private isValid(isbn: string): boolean {
    // Simple validation: ISBN should be 10 or 13 digits
    const cleaned = isbn.replace(/-/g, "");
    return /^\d{10}$|^\d{13}$/.test(cleaned);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Book Status Enum
 */
export enum BookStatus {
  AVAILABLE = "AVAILABLE",
  BORROWED = "BORROWED",
  LOST = "LOST",
  MAINTENANCE = "MAINTENANCE",
}

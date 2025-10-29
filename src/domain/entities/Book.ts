/**
 * Book Entity
 * Represents a book in the library system with borrowing status
 */

import { BookId } from '../valueobjects/BookId';
import { UserId } from '../valueobjects/UserId';

export enum BookStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  MAINTENANCE = 'maintenance',
}

export class Book {
  private constructor(
    public readonly id: BookId,
    public readonly title: string,
    public readonly author: string,
    public readonly isbn: string,
    public readonly status: BookStatus,
    public readonly borrowedBy: UserId | null,
    public readonly borrowedAt: Date | null,
    public readonly createdAt: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Book title cannot be empty');
    }
    if (!this.author || this.author.trim().length === 0) {
      throw new Error('Book author cannot be empty');
    }
    if (!this.isbn || !/^\d{13}$/.test(this.isbn)) {
      throw new Error('ISBN must be 13 digits');
    }
    if (this.status === BookStatus.BORROWED && !this.borrowedBy) {
      throw new Error('Borrowed book must have a borrower');
    }
    if (this.status !== BookStatus.BORROWED && this.borrowedBy) {
      throw new Error('Only borrowed books can have a borrower');
    }
  }

  /**
   * Factory method to create a new book
   */
  static create(title: string, author: string, isbn: string): Book {
    return new Book(
      BookId.generate(),
      title,
      author,
      isbn,
      BookStatus.AVAILABLE,
      null,
      null,
      new Date()
    );
  }

  /**
   * Check if the book is available for borrowing
   */
  isAvailable(): boolean {
    return this.status === BookStatus.AVAILABLE;
  }

  /**
   * Mark book as borrowed by a user
   * Returns a new Book instance (immutable)
   */
  borrow(userId: UserId): Book {
    if (!this.isAvailable()) {
      throw new Error('Book is not available for borrowing');
    }

    return new Book(
      this.id,
      this.title,
      this.author,
      this.isbn,
      BookStatus.BORROWED,
      userId,
      new Date(),
      this.createdAt
    );
  }

  /**
   * Mark book as returned and available again
   * Returns a new Book instance (immutable)
   */
  returnBook(): Book {
    if (this.status !== BookStatus.BORROWED) {
      throw new Error('Only borrowed books can be returned');
    }

    return new Book(
      this.id,
      this.title,
      this.author,
      this.isbn,
      BookStatus.AVAILABLE,
      null,
      null,
      this.createdAt
    );
  }

  /**
   * Mark book as under maintenance
   * Returns a new Book instance (immutable)
   */
  markAsMaintenance(): Book {
    if (this.status === BookStatus.BORROWED) {
      throw new Error('Cannot mark borrowed book as maintenance');
    }

    return new Book(
      this.id,
      this.title,
      this.author,
      this.isbn,
      BookStatus.MAINTENANCE,
      null,
      null,
      this.createdAt
    );
  }

  /**
   * Mark book as available after maintenance
   * Returns a new Book instance (immutable)
   */
  makeAvailable(): Book {
    return new Book(
      this.id,
      this.title,
      this.author,
      this.isbn,
      BookStatus.AVAILABLE,
      null,
      null,
      this.createdAt
    );
  }

  /**
   * Check if book is overdue (borrowed more than 14 days ago)
   */
  isOverdue(): boolean {
    if (this.status !== BookStatus.BORROWED || !this.borrowedAt) {
      return false;
    }

    const daysBorrowed = Math.floor(
      (Date.now() - this.borrowedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysBorrowed > 14;
  }

  /**
   * Calculate overdue days (0 if not overdue)
   */
  getOverdueDays(): number {
    if (!this.isOverdue()) {
      return 0;
    }

    const daysBorrowed = Math.floor(
      (Date.now() - this.borrowedAt!.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysBorrowed - 14;
  }
}

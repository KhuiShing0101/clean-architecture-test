/**
 * Book Entity
 * Represents a book in the library system with borrowing status
 */

import { BookId } from '../valueobjects/BookId';
import { UserId } from '../valueobjects/UserId';
import { IDomainEvent } from '../events/IDomainEvent';
import { BookAvailableEvent } from '../events/BookAvailableEvent';

export enum BookStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  MAINTENANCE = 'maintenance',
}

export class Book {
  private domainEvents: IDomainEvent[] = [];

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
   * Raises BookAvailableEvent
   */
  returnBook(): Book {
    if (this.status !== BookStatus.BORROWED) {
      throw new Error('Only borrowed books can be returned');
    }

    const returnedBook = new Book(
      this.id,
      this.title,
      this.author,
      this.isbn,
      BookStatus.AVAILABLE,
      null,
      null,
      this.createdAt
    );

    // Raise domain event: book is now available
    returnedBook.addDomainEvent(new BookAvailableEvent(this.id));

    return returnedBook;
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
   * Get total days the book has been borrowed
   */
  getDaysBorrowed(): number {
    if (this.status !== BookStatus.BORROWED || !this.borrowedAt) {
      return 0;
    }

    return Math.floor(
      (Date.now() - this.borrowedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Check if book is overdue (borrowed more than 14 days ago)
   */
  isOverdue(): boolean {
    return this.getDaysBorrowed() > 14;
  }

  /**
   * Calculate overdue days beyond the 14-day limit
   * Returns 0 if not overdue
   */
  getOverdueDays(): number {
    const daysBorrowed = this.getDaysBorrowed();
    const dueDate = 14; // 14-day borrowing period

    if (daysBorrowed <= dueDate) {
      return 0;
    }

    return daysBorrowed - dueDate;
  }

  /**
   * Calculate overdue fee based on business rules
   * - ¥10 per day after grace period
   * - First 3 days overdue are free (grace period)
   * - Maximum fee capped at ¥1,000
   */
  calculateOverdueFee(): number {
    const overdueDays = this.getOverdueDays();

    // No fee if not overdue
    if (overdueDays === 0) {
      return 0;
    }

    // Grace period: first 3 days are free
    const GRACE_PERIOD = 3;
    const FEE_PER_DAY = 10; // ¥10 per day
    const MAX_FEE = 1000; // ¥1,000 maximum

    if (overdueDays <= GRACE_PERIOD) {
      return 0;
    }

    // Calculate fee after grace period
    const chargeableDays = overdueDays - GRACE_PERIOD;
    const calculatedFee = chargeableDays * FEE_PER_DAY;

    // Apply maximum cap
    return Math.min(calculatedFee, MAX_FEE);
  }

  /**
   * Add a domain event to this entity
   * Events are collected and published by the use case
   */
  private addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get all domain events raised by this entity
   * This allows the use case to retrieve and publish them
   */
  getDomainEvents(): IDomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clear domain events after they've been published
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}

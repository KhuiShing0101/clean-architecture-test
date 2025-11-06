/**
 * Reservation Entity
 * Domain layer - Represents a user's reservation for a book
 *
 * Business Rules:
 * - 3-day hold period when ready
 * - FIFO queue ordering
 * - Automatic expiration
 */

import { ReservationId } from '../valueobjects/ReservationId';
import { UserId } from '../valueobjects/UserId';
import { BookId } from '../valueobjects/BookId';

export enum ReservationStatus {
  ACTIVE = 'active',        // Waiting in queue
  READY = 'ready',          // Book available, user can borrow
  FULFILLED = 'fulfilled',  // User borrowed the book
  EXPIRED = 'expired',      // 3 days passed without borrowing
  CANCELLED = 'cancelled'   // User cancelled
}

export class Reservation {
  /**
   * Hold period in days when reservation is ready
   */
  static readonly HOLD_PERIOD_DAYS = 3;

  private constructor(
    public readonly id: ReservationId,
    public readonly userId: UserId,
    public readonly bookId: BookId,
    public readonly status: ReservationStatus,
    public readonly createdAt: Date,
    public readonly readyAt: Date | null,
    public readonly expiresAt: Date | null
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.status === ReservationStatus.READY) {
      if (!this.readyAt || !this.expiresAt) {
        throw new Error('READY reservations must have readyAt and expiresAt');
      }
    }

    if (this.expiresAt && this.expiresAt <= this.createdAt) {
      throw new Error('Expiration date must be after creation date');
    }
  }

  /**
   * Factory method to create a new reservation
   */
  static create(userId: UserId, bookId: BookId): Reservation {
    return new Reservation(
      ReservationId.generate(),
      userId,
      bookId,
      ReservationStatus.ACTIVE,
      new Date(),
      null,
      null
    );
  }

  /**
   * Recreate reservation from persistence
   */
  static restore(
    id: ReservationId,
    userId: UserId,
    bookId: BookId,
    status: ReservationStatus,
    createdAt: Date,
    readyAt: Date | null,
    expiresAt: Date | null
  ): Reservation {
    return new Reservation(id, userId, bookId, status, createdAt, readyAt, expiresAt);
  }

  /**
   * Mark reservation as ready (book is now available)
   * Starts the 3-day countdown
   */
  markAsReady(): Reservation {
    if (this.status !== ReservationStatus.ACTIVE) {
      throw new Error('Only active reservations can be marked as ready');
    }

    const readyAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Reservation.HOLD_PERIOD_DAYS);

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.READY,
      this.createdAt,
      readyAt,
      expiresAt
    );
  }

  /**
   * Check if reservation has expired (only applies to READY status)
   */
  isExpired(): boolean {
    if (this.status !== ReservationStatus.READY || !this.expiresAt) {
      return false;
    }
    return Date.now() > this.expiresAt.getTime();
  }

  /**
   * Get remaining days before expiration
   */
  getRemainingDays(): number {
    if (this.status !== ReservationStatus.READY || !this.expiresAt) {
      return 0;
    }

    const remainingMs = this.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Mark reservation as fulfilled (user borrowed the book)
   */
  fulfill(): Reservation {
    if (this.status !== ReservationStatus.READY) {
      throw new Error('Only ready reservations can be fulfilled');
    }

    if (this.isExpired()) {
      throw new Error('Cannot fulfill expired reservation');
    }

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.FULFILLED,
      this.createdAt,
      this.readyAt,
      this.expiresAt
    );
  }

  /**
   * Mark reservation as expired
   */
  expire(): Reservation {
    if (this.status !== ReservationStatus.READY) {
      throw new Error('Only ready reservations can expire');
    }

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.EXPIRED,
      this.createdAt,
      this.readyAt,
      this.expiresAt
    );
  }

  /**
   * Cancel reservation
   */
  cancel(): Reservation {
    if (this.status === ReservationStatus.FULFILLED) {
      throw new Error('Cannot cancel fulfilled reservation');
    }

    if (this.status === ReservationStatus.EXPIRED) {
      throw new Error('Cannot cancel expired reservation');
    }

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.CANCELLED,
      this.createdAt,
      this.readyAt,
      this.expiresAt
    );
  }

  /**
   * Check if reservation is active (waiting in queue)
   */
  isActive(): boolean {
    return this.status === ReservationStatus.ACTIVE;
  }

  /**
   * Check if reservation is ready (user can borrow now)
   */
  isReady(): boolean {
    return this.status === ReservationStatus.READY && !this.isExpired();
  }
}

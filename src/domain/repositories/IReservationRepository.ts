/**
 * IReservationRepository
 * Domain layer - Repository interface for Reservation aggregate
 */

import { Reservation, ReservationStatus } from '../entities/Reservation';
import { ReservationId } from '../valueobjects/ReservationId';
import { UserId } from '../valueobjects/UserId';
import { BookId } from '../valueobjects/BookId';

export interface IReservationRepository {
  /**
   * Save or update a reservation
   */
  save(reservation: Reservation): Promise<void>;

  /**
   * Find reservation by ID
   */
  findById(id: ReservationId): Promise<Reservation | null>;

  /**
   * Find all active reservations for a specific book (for queue management)
   */
  findActiveByBook(bookId: BookId): Promise<Reservation[]>;

  /**
   * Find reservations by status
   */
  findByStatus(status: ReservationStatus): Promise<Reservation[]>;

  /**
   * Find all reservations for a user and book
   */
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<Reservation[]>;

  /**
   * Find all reservations for a user
   */
  findByUser(userId: UserId): Promise<Reservation[]>;

  /**
   * Delete a reservation
   */
  delete(id: ReservationId): Promise<void>;

  /**
   * Find all reservations
   */
  findAll(): Promise<Reservation[]>;
}

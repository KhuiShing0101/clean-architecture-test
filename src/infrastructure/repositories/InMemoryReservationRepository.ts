/**
 * InMemoryReservationRepository
 * Infrastructure layer - In-memory implementation of IReservationRepository
 */

import { IReservationRepository } from '../../domain/repositories/IReservationRepository';
import { Reservation, ReservationStatus } from '../../domain/entities/Reservation';
import { ReservationId } from '../../domain/valueobjects/ReservationId';
import { UserId } from '../../domain/valueobjects/UserId';
import { BookId } from '../../domain/valueobjects/BookId';

export class InMemoryReservationRepository implements IReservationRepository {
  private reservations: Map<string, Reservation> = new Map();

  async save(reservation: Reservation): Promise<void> {
    this.reservations.set(reservation.id.getValue(), reservation);
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    return this.reservations.get(id.getValue()) || null;
  }

  async findActiveByBook(bookId: BookId): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.bookId.equals(bookId) && r.status === ReservationStatus.ACTIVE
    );
  }

  async findByStatus(status: ReservationStatus): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.status === status
    );
  }

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.userId.equals(userId) && r.bookId.equals(bookId)
    );
  }

  async findByUser(userId: UserId): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.userId.equals(userId)
    );
  }

  async delete(id: ReservationId): Promise<void> {
    this.reservations.delete(id.getValue());
  }

  async findAll(): Promise<Reservation[]> {
    return Array.from(this.reservations.values());
  }
}

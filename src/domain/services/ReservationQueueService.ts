/**
 * ReservationQueueService
 * Domain service for managing FIFO reservation queue
 */

import { User } from '../entities/User';
import { Book } from '../entities/Book';
import { Reservation, ReservationStatus } from '../entities/Reservation';
import { IReservationRepository } from '../repositories/IReservationRepository';
import { BookId } from '../valueobjects/BookId';
import { BookReservedEvent } from '../events/BookReservedEvent';
import { ReservationExpiredEvent } from '../events/ReservationExpiredEvent';
import { ReservationReadyEvent } from '../events/ReservationReadyEvent';
import { DomainEventPublisher } from './DomainEventPublisher';

export interface ReservationResult {
  success: boolean;
  reservation?: Reservation;
  error?: string;
}

export class ReservationQueueService {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {}

  /**
   * Add user to reservation queue for a book
   */
  async reserveBook(user: User, book: Book): Promise<ReservationResult> {
    // Check if user already has active reservation for this book
    const existingReservations = await this.reservationRepository.findByUserAndBook(
      user.id,
      book.id
    );

    const hasActiveReservation = existingReservations.some(
      (r) => r.status === ReservationStatus.ACTIVE || r.status === ReservationStatus.READY
    );

    if (hasActiveReservation) {
      return {
        success: false,
        error: 'User already has active reservation for this book',
      };
    }

    // Create new reservation
    const reservation = Reservation.create(user.id, book.id);
    await this.reservationRepository.save(reservation);

    // Publish event
    const event = new BookReservedEvent(reservation.id, user.id, book.id);
    await DomainEventPublisher.getInstance().publish(event);

    return {
      success: true,
      reservation,
    };
  }

  /**
   * Get next user in queue (FIFO - earliest first)
   */
  async getNextInQueue(bookId: BookId): Promise<Reservation | null> {
    const activeReservations = await this.reservationRepository.findActiveByBook(bookId);

    if (activeReservations.length === 0) {
      return null;
    }

    // FIFO: sort by createdAt (earliest first)
    activeReservations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return activeReservations[0];
  }

  /**
   * Get queue position for a reservation
   */
  async getQueuePosition(bookId: BookId, userId: string): Promise<number> {
    const activeReservations = await this.reservationRepository.findActiveByBook(bookId);

    // Sort by FIFO
    activeReservations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const position = activeReservations.findIndex(
      (r) => r.userId.getValue() === userId
    );

    return position === -1 ? 0 : position + 1;
  }

  /**
   * Mark next reservation in queue as ready and set expiration
   */
  async notifyNextInQueue(bookId: BookId): Promise<void> {
    const nextReservation = await this.getNextInQueue(bookId);

    if (!nextReservation) {
      console.log(`📚 No more reservations in queue for book ${bookId.getValue()}`);
      return;
    }

    // Mark as ready (starts 3-day countdown)
    const readyReservation = nextReservation.markAsReady();
    await this.reservationRepository.save(readyReservation);

    // Publish ready event
    const event = new ReservationReadyEvent(
      readyReservation.id,
      readyReservation.userId,
      readyReservation.bookId,
      readyReservation.expiresAt!
    );
    await DomainEventPublisher.getInstance().publish(event);

    console.log(`\n📢 Notification: Book ${bookId.getValue()} is now available!`);
    console.log(`   User: ${readyReservation.userId.getValue()}`);
    console.log(`   ⏰ You have 3 days to borrow before reservation expires`);
    console.log(`   Expires: ${readyReservation.expiresAt!.toLocaleString()}\n`);
  }

  /**
   * Process expired reservations and notify next in queue
   */
  async processExpiredReservations(): Promise<number> {
    const readyReservations = await this.reservationRepository.findByStatus(
      ReservationStatus.READY
    );

    let expiredCount = 0;

    for (const reservation of readyReservations) {
      if (reservation.isExpired()) {
        // Mark as expired
        const expiredReservation = reservation.expire();
        await this.reservationRepository.save(expiredReservation);
        expiredCount++;

        // Publish expiration event
        const event = new ReservationExpiredEvent(
          reservation.id,
          reservation.userId,
          reservation.bookId
        );
        await DomainEventPublisher.getInstance().publish(event);

        console.log(`\n⏰ Reservation expired: ${reservation.id.getValue()}`);
        console.log(`   User: ${reservation.userId.getValue()} missed the 3-day window\n`);

        // Notify next user in queue
        await this.notifyNextInQueue(reservation.bookId);
      }
    }

    return expiredCount;
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservation: Reservation): Promise<void> {
    const cancelled = reservation.cancel();
    await this.reservationRepository.save(cancelled);

    // If this was a ready reservation, notify next in queue
    if (reservation.status === ReservationStatus.READY) {
      await this.notifyNextInQueue(reservation.bookId);
    }
  }

  /**
   * Fulfill a reservation (user borrowed the book)
   */
  async fulfillReservation(reservation: Reservation): Promise<void> {
    const fulfilled = reservation.fulfill();
    await this.reservationRepository.save(fulfilled);
  }
}

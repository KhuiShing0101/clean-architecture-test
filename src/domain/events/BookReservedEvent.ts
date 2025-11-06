/**
 * BookReservedEvent
 * Published when a user creates a book reservation
 */

import { DomainEvent } from './IDomainEvent';
import { ReservationId } from '../valueobjects/ReservationId';
import { UserId } from '../valueobjects/UserId';
import { BookId } from '../valueobjects/BookId';

export class BookReservedEvent extends DomainEvent {
  public readonly eventType = 'BookReserved';

  constructor(
    public readonly reservationId: ReservationId,
    public readonly userId: UserId,
    public readonly bookId: BookId
  ) {
    super();
  }
}

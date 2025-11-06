/**
 * ReservationReadyEvent
 * Published when a reservation becomes ready (user's turn to borrow)
 */

import { DomainEvent } from './IDomainEvent';
import { ReservationId } from '../valueobjects/ReservationId';
import { UserId } from '../valueobjects/UserId';
import { BookId } from '../valueobjects/BookId';

export class ReservationReadyEvent extends DomainEvent {
  public readonly eventType = 'ReservationReady';

  constructor(
    public readonly reservationId: ReservationId,
    public readonly userId: UserId,
    public readonly bookId: BookId,
    public readonly expiresAt: Date
  ) {
    super();
  }
}

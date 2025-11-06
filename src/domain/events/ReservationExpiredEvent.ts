/**
 * ReservationExpiredEvent
 * Published when a reservation expires (3 days passed without borrowing)
 */

import { DomainEvent } from './IDomainEvent';
import { ReservationId } from '../valueobjects/ReservationId';
import { UserId } from '../valueobjects/UserId';
import { BookId } from '../valueobjects/BookId';

export class ReservationExpiredEvent extends DomainEvent {
  public readonly eventType = 'ReservationExpired';

  constructor(
    public readonly reservationId: ReservationId,
    public readonly userId: UserId,
    public readonly bookId: BookId
  ) {
    super();
  }
}

/**
 * BookAvailableEvent
 * Published when a book becomes available (returned)
 */

import { DomainEvent } from './IDomainEvent';
import { BookId } from '../valueobjects/BookId';

export class BookAvailableEvent extends DomainEvent {
  public readonly eventType = 'BookAvailable';

  constructor(
    public readonly bookId: BookId
  ) {
    super();
  }
}

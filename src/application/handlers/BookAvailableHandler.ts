/**
 * BookAvailableHandler
 * Application layer - Handles BookAvailableEvent and notifies next in queue
 */

import { BookAvailableEvent } from '../../domain/events/BookAvailableEvent';
import { ReservationQueueService } from '../../domain/services/ReservationQueueService';
import { DomainEventPublisher } from '../../domain/services/DomainEventPublisher';

export class BookAvailableHandler {
  constructor(
    private readonly queueService: ReservationQueueService
  ) {
    // Subscribe to BookAvailableEvent
    DomainEventPublisher.getInstance().subscribe(
      'BookAvailable',
      (event) => this.handle(event as BookAvailableEvent)
    );
  }

  /**
   * Handle BookAvailableEvent
   * Notify next user in queue that book is available
   */
  async handle(event: BookAvailableEvent): Promise<void> {
    console.log(`\n🔔 Event Received: Book ${event.bookId.getValue()} is now available`);
    console.log(`   Event ID: ${event.eventId}`);
    console.log(`   Occurred at: ${event.occurredAt.toLocaleString()}`);

    // Notify next user in reservation queue
    await this.queueService.notifyNextInQueue(event.bookId);
  }
}

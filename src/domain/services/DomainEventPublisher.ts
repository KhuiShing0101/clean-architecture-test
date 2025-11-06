/**
 * DomainEventPublisher
 * Singleton service for publishing and subscribing to domain events
 * Implements Observer Pattern
 */

import { IDomainEvent } from '../events/IDomainEvent';

type EventHandler = (event: IDomainEvent) => void | Promise<void>;

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, Array<EventHandler>>;

  private constructor() {
    this.handlers = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(event: IDomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType);

    if (eventHandlers) {
      // Execute all handlers
      for (const handler of eventHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.eventType}:`, error);
        }
      }
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Clear handlers for specific event type
   */
  clearHandlersForEvent(eventType: string): void {
    this.handlers.delete(eventType);
  }

  /**
   * Get number of subscribers for an event type
   */
  getSubscriberCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }
}

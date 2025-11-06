/**
 * EventBus Implementation
 * Infrastructure layer - Concrete implementation of IEventBus
 *
 * This implementation can be injected and tested easily.
 * No singleton pattern - proper dependency injection.
 */

import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { IEventBus, EventHandler } from '../../domain/events/IEventBus';

export class EventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]>;

  constructor() {
    this.handlers = new Map<string, EventHandler[]>();
  }

  /**
   * Publish an event to all registered handlers
   */
  async publish(event: IDomainEvent): Promise<void> {
    const eventType = event.eventType;
    const eventHandlers = this.handlers.get(eventType) || [];

    // Execute all handlers for this event type
    for (const handler of eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error);
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Subscribe a handler to a specific event type
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.push(handler as EventHandler);
  }

  /**
   * Unsubscribe a handler from an event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    // Clean up empty handler arrays
    if (handlers.length === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Get count of subscribers for an event type (useful for testing)
   */
  getSubscriberCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

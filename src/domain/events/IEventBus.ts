/**
 * IEventBus Interface
 * Domain layer - Abstraction for event publishing and subscription
 *
 * This allows the domain and application layers to publish/subscribe to events
 * without depending on a concrete implementation.
 */

import { IDomainEvent } from './IDomainEvent';

export type EventHandler<T extends IDomainEvent = IDomainEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  /**
   * Publish an event to all subscribers
   */
  publish(event: IDomainEvent): Promise<void>;

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void;

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void;
}

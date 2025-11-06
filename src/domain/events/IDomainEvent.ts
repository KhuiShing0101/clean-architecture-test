/**
 * Domain Event Interface
 * Base interface for all domain events
 */

export interface IDomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

/**
 * Abstract base class for domain events
 */
export abstract class DomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public abstract readonly eventType: string;

  constructor() {
    this.eventId = this.generateEventId();
    this.occurredAt = new Date();
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

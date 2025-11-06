# Lesson 5: Domain Events and Reservation System

## Learning Objectives

- Understand Domain Events and Event-Driven Architecture
- Implement event publishing and subscription patterns
- Master queue management with FIFO ordering
- Apply time-based expiration logic
- Coordinate complex multi-aggregate workflows
- Decouple components through events

## Concepts Covered

### 1. Domain Events
Events that represent something important that happened in the domain. They enable loose coupling between aggregates.

### 2. Event-Driven Architecture
Components communicate through events rather than direct calls, enabling scalability and maintainability.

### 3. Aggregate Root
The Reservation entity acts as an aggregate root, managing its lifecycle and publishing events.

### 4. FIFO Queue Management
First-In-First-Out queue for fair reservation ordering when books become available.

### 5. Time-Based Expiration
Automatic cleanup of expired reservations after 3-day hold period.

### 6. Event Publisher/Subscriber Pattern
Decoupled notification system where publishers don't know about subscribers.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Book.ts                      # Updated: Add reservation status ⭐
│   │   ├── User.ts
│   │   └── Reservation.ts               # NEW: Reservation entity ⭐
│   ├── valueobjects/
│   │   ├── BookId.ts
│   │   ├── UserId.ts
│   │   └── ReservationId.ts             # NEW: Reservation ID ⭐
│   ├── events/
│   │   ├── IDomainEvent.ts              # NEW: Event interface ⭐
│   │   ├── BookReservedEvent.ts         # NEW: Reservation created ⭐
│   │   ├── BookAvailableEvent.ts        # NEW: Book available ⭐
│   │   └── ReservationExpiredEvent.ts   # NEW: Reservation expired ⭐
│   ├── services/
│   │   ├── BorrowBookService.ts
│   │   ├── ReservationQueueService.ts   # NEW: FIFO queue ⭐
│   │   └── DomainEventPublisher.ts      # NEW: Event publisher ⭐
│   └── repositories/
│       ├── IBookRepository.ts
│       ├── IUserRepository.ts
│       └── IReservationRepository.ts    # NEW: Reservation repo ⭐
├── application/
│   ├── usecases/
│   │   ├── BorrowBookUseCase.ts
│   │   ├── ReturnBookUseCase.ts         # Updated: Publish event ⭐
│   │   ├── ReserveBookUseCase.ts        # NEW: Reserve book ⭐
│   │   ├── CancelReservationUseCase.ts  # NEW: Cancel reservation ⭐
│   │   └── ProcessReservationUseCase.ts # NEW: Process when available ⭐
│   └── handlers/
│       └── BookAvailableHandler.ts      # NEW: Event handler ⭐
├── infrastructure/
│   └── repositories/
│       └── InMemoryReservationRepository.ts  # NEW ⭐
├── presentation/
│   └── controllers/
│       ├── BookController.ts            # Updated: Add reserve endpoint ⭐
│       └── ReservationController.ts     # NEW ⭐
└── main.ts                              # Updated: Demo lesson 5 ⭐
```

## Key Components

### Reservation Entity (`src/domain/entities/Reservation.ts`)

**Purpose:** Represents a user's reservation for a book with expiration logic.

#### ReservationStatus Enum
```typescript
enum ReservationStatus {
  ACTIVE = 'active',        // Waiting in queue
  READY = 'ready',          // Book available, user can borrow
  FULFILLED = 'fulfilled',  // User borrowed the book
  EXPIRED = 'expired',      // 3 days passed without borrowing
  CANCELLED = 'cancelled'   // User cancelled
}
```

#### Key Features
```typescript
✅ Factory method: Reservation.create()
✅ 3-day expiration period
✅ Status transitions (ACTIVE → READY → FULFILLED)
✅ Expiration check: isExpired()
✅ Automatic status updates
✅ Queue position tracking
✅ Immutable state changes
```

#### Business Logic
```typescript
class Reservation {
  static readonly HOLD_PERIOD_DAYS = 3;

  static create(userId: UserId, bookId: BookId): Reservation {
    return new Reservation(
      ReservationId.generate(),
      userId,
      bookId,
      ReservationStatus.ACTIVE,
      new Date(),      // createdAt
      null,            // readyAt
      null             // expiresAt
    );
  }

  markAsReady(): Reservation {
    const readyAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Reservation.HOLD_PERIOD_DAYS);

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.READY,
      this.createdAt,
      readyAt,
      expiresAt
    );
  }

  isExpired(): boolean {
    if (this.status !== ReservationStatus.READY || !this.expiresAt) {
      return false;
    }
    return Date.now() > this.expiresAt.getTime();
  }

  fulfill(): Reservation {
    if (this.status !== ReservationStatus.READY) {
      throw new Error('Only ready reservations can be fulfilled');
    }
    if (this.isExpired()) {
      throw new Error('Reservation has expired');
    }

    return new Reservation(
      this.id,
      this.userId,
      this.bookId,
      ReservationStatus.FULFILLED,
      this.createdAt,
      this.readyAt,
      this.expiresAt
    );
  }
}
```

### Domain Events Interface (`src/domain/events/IDomainEvent.ts`)

**Purpose:** Base interface for all domain events.

```typescript
export interface IDomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

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
```

### Domain Event Types

#### BookReservedEvent
```typescript
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
```

#### BookAvailableEvent
```typescript
export class BookAvailableEvent extends DomainEvent {
  public readonly eventType = 'BookAvailable';

  constructor(
    public readonly bookId: BookId
  ) {
    super();
  }
}
```

#### ReservationExpiredEvent
```typescript
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
```

### DomainEventPublisher (`src/domain/services/DomainEventPublisher.ts`)

**Purpose:** Publish and subscribe to domain events (Observer Pattern).

```typescript
export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, Array<(event: IDomainEvent) => void>>;

  private constructor() {
    this.handlers = new Map();
  }

  static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  publish(event: IDomainEvent): void {
    const eventHandlers = this.handlers.get(event.eventType);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(event));
    }
  }

  clearHandlers(): void {
    this.handlers.clear();
  }
}
```

**Key Features:**
- ✅ Singleton pattern (single event bus)
- ✅ Type-based subscription
- ✅ Publish to all subscribers
- ✅ Decoupled communication

### ReservationQueueService (`src/domain/services/ReservationQueueService.ts`)

**Purpose:** Manage FIFO queue of reservations for each book.

```typescript
export class ReservationQueueService {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {}

  /**
   * Add user to reservation queue for a book
   */
  async reserveBook(user: User, book: Book): Promise<ReservationResult> {
    // Check if user already has active reservation
    const existingReservations = await this.reservationRepository.findByUserAndBook(
      user.id,
      book.id
    );

    if (existingReservations.some(r => r.status === ReservationStatus.ACTIVE)) {
      return {
        success: false,
        error: 'User already has active reservation for this book'
      };
    }

    // Create new reservation
    const reservation = Reservation.create(user.id, book.id);
    await this.reservationRepository.save(reservation);

    // Publish event
    const event = new BookReservedEvent(reservation.id, user.id, book.id);
    DomainEventPublisher.getInstance().publish(event);

    return {
      success: true,
      reservation
    };
  }

  /**
   * Get next user in queue (FIFO) when book becomes available
   */
  async getNextInQueue(bookId: BookId): Promise<Reservation | null> {
    const activeReservations = await this.reservationRepository.findActiveByBook(bookId);

    if (activeReservations.length === 0) {
      return null;
    }

    // FIFO: sort by createdAt (earliest first)
    activeReservations.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    return activeReservations[0];
  }

  /**
   * Mark reservation as ready and set expiration
   */
  async notifyNextInQueue(bookId: BookId): Promise<void> {
    const nextReservation = await this.getNextInQueue(bookId);

    if (!nextReservation) {
      return;
    }

    // Mark as ready (starts 3-day countdown)
    const readyReservation = nextReservation.markAsReady();
    await this.reservationRepository.save(readyReservation);

    console.log(`📢 Notification: Book ${bookId.getValue()} is now available for user ${nextReservation.userId.getValue()}`);
    console.log(`⏰ You have 3 days to borrow the book before reservation expires`);
  }

  /**
   * Check and expire old reservations
   */
  async processExpiredReservations(): Promise<void> {
    const readyReservations = await this.reservationRepository.findByStatus(
      ReservationStatus.READY
    );

    for (const reservation of readyReservations) {
      if (reservation.isExpired()) {
        const expiredReservation = reservation.expire();
        await this.reservationRepository.save(expiredReservation);

        // Publish expiration event
        const event = new ReservationExpiredEvent(
          reservation.id,
          reservation.userId,
          reservation.bookId
        );
        DomainEventPublisher.getInstance().publish(event);

        // Notify next in queue
        await this.notifyNextInQueue(reservation.bookId);
      }
    }
  }
}
```

**Key Features:**
- ✅ FIFO ordering (earliest createdAt first)
- ✅ Prevent duplicate reservations
- ✅ Automatic expiration processing
- ✅ Event publishing for notifications
- ✅ Queue cascade (next user notified when expiration occurs)

### ReserveBookUseCase (`src/application/usecases/ReserveBookUseCase.ts`)

**Purpose:** Application orchestration for book reservation.

```typescript
export class ReserveBookUseCase {
  private queueService: ReservationQueueService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly reservationRepository: IReservationRepository
  ) {
    this.queueService = new ReservationQueueService(reservationRepository);
  }

  async execute(input: ReserveBookInput): Promise<ReserveBookOutput> {
    // Find user
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Find book
    const bookId = BookId.create(input.bookId);
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      return { success: false, message: 'Book not found' };
    }

    // Check if book is available
    if (book.isAvailable()) {
      return {
        success: false,
        message: 'Book is currently available. Please borrow it directly.'
      };
    }

    // Reserve book
    const result = await this.queueService.reserveBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to reserve book'
      };
    }

    // Get queue position
    const queuePosition = await this.getQueuePosition(
      result.reservation!.id,
      book.id
    );

    return {
      success: true,
      message: `Book reserved successfully. You are #${queuePosition} in queue.`,
      reservation: {
        id: result.reservation!.id.getValue(),
        status: result.reservation!.status,
        queuePosition
      }
    };
  }

  private async getQueuePosition(
    reservationId: ReservationId,
    bookId: BookId
  ): Promise<number> {
    const activeReservations = await this.reservationRepository.findActiveByBook(bookId);
    activeReservations.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    return activeReservations.findIndex(r => r.id.equals(reservationId)) + 1;
  }
}
```

### Updated ReturnBookUseCase with Event Publishing

**Change:** Publish `BookAvailableEvent` when book is returned.

```typescript
async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
  // ... existing return logic ...

  // After successful return, publish event
  if (result.success) {
    const event = new BookAvailableEvent(book.id);
    DomainEventPublisher.getInstance().publish(event);
  }

  return { /* ... */ };
}
```

### BookAvailableHandler (`src/application/handlers/BookAvailableHandler.ts`)

**Purpose:** Listen for book availability and notify next in queue.

```typescript
export class BookAvailableHandler {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {
    // Subscribe to BookAvailableEvent
    DomainEventPublisher.getInstance().subscribe(
      'BookAvailable',
      (event) => this.handle(event as BookAvailableEvent)
    );
  }

  async handle(event: BookAvailableEvent): Promise<void> {
    console.log(`\n🔔 Event: Book ${event.bookId.getValue()} is now available`);

    const queueService = new ReservationQueueService(this.reservationRepository);
    await queueService.notifyNextInQueue(event.bookId);
  }
}
```

## Business Rules

### Reservation Lifecycle

```
1. User reserves unavailable book
   → Status: ACTIVE
   → Enters FIFO queue

2. Book becomes available
   → BookAvailableEvent published
   → Next reservation in queue: Status → READY
   → 3-day countdown starts

3a. User borrows within 3 days
    → Status: FULFILLED
    → Reservation complete ✅

3b. 3 days pass without borrowing
    → Status: EXPIRED
    → Next in queue notified
    → Reservation removed ❌

4. User cancels reservation
   → Status: CANCELLED
   → Removed from queue
```

### Queue Management Rules

```typescript
✅ FIFO Ordering: Earliest createdAt = first in line
✅ No Duplicates: One active reservation per user per book
✅ Automatic Expiration: 3 days after ready
✅ Cascade Notification: Next user notified on expiration
✅ Direct Borrow: Don't allow reservations for available books
```

## Event Flow Diagram

```
┌─────────────┐
│ Return Book │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│ BookAvailableEvent   │  ← Domain Event Published
└──────┬───────────────┘
       │
       ↓
┌──────────────────────────┐
│ BookAvailableHandler     │  ← Event Handler
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ ReservationQueueService  │  ← Get next in queue
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Notification to User     │  ← "Book is ready!"
│ Status: ACTIVE → READY   │
│ Expiration: Now + 3 days │
└──────────────────────────┘
```

## Testing Strategy

### Reservation Entity Tests
```typescript
test('creates reservation with ACTIVE status', () => {
  const reservation = Reservation.create(userId, bookId);
  expect(reservation.status).toBe(ReservationStatus.ACTIVE);
  expect(reservation.expiresAt).toBeNull();
});

test('markAsReady sets expiration 3 days from now', () => {
  const reservation = Reservation.create(userId, bookId);
  const ready = reservation.markAsReady();

  expect(ready.status).toBe(ReservationStatus.READY);
  expect(ready.expiresAt).toBeDefined();

  const expectedExpiration = new Date();
  expectedExpiration.setDate(expectedExpiration.getDate() + 3);
  expect(ready.expiresAt!.getDate()).toBe(expectedExpiration.getDate());
});

test('isExpired returns true after 3 days', () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 4); // 4 days ago

  const reservation = new Reservation(
    ReservationId.generate(),
    userId,
    bookId,
    ReservationStatus.READY,
    pastDate,
    pastDate,
    new Date(pastDate.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days
  );

  expect(reservation.isExpired()).toBe(true);
});
```

### Queue Service Tests
```typescript
test('FIFO ordering - earliest reservation first', async () => {
  // Create 3 reservations at different times
  const res1 = Reservation.create(user1.id, bookId);
  await delay(100);
  const res2 = Reservation.create(user2.id, bookId);
  await delay(100);
  const res3 = Reservation.create(user3.id, bookId);

  await repo.save(res1);
  await repo.save(res2);
  await repo.save(res3);

  const next = await queueService.getNextInQueue(bookId);
  expect(next!.userId.equals(user1.id)).toBe(true);
});

test('prevents duplicate active reservations', async () => {
  const result1 = await queueService.reserveBook(user, book);
  expect(result1.success).toBe(true);

  const result2 = await queueService.reserveBook(user, book);
  expect(result2.success).toBe(false);
  expect(result2.error).toContain('already has active reservation');
});
```

### Event Publisher Tests
```typescript
test('publishes event to all subscribers', () => {
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  publisher.subscribe('BookAvailable', handler1);
  publisher.subscribe('BookAvailable', handler2);

  const event = new BookAvailableEvent(bookId);
  publisher.publish(event);

  expect(handler1).toHaveBeenCalledWith(event);
  expect(handler2).toHaveBeenCalledWith(event);
});
```

## Common Patterns

### ❌ Tight Coupling Without Events
```typescript
// BAD: Use case directly calls notification logic
class ReturnBookUseCase {
  async execute(input) {
    await this.borrowService.returnBook(user, book);

    // ❌ Tight coupling to reservation system
    const nextUser = await this.reservationService.getNext(book.id);
    if (nextUser) {
      await this.notificationService.notify(nextUser);
    }
  }
}
```

### ✅ Loose Coupling With Events
```typescript
// GOOD: Use case publishes event, handlers respond
class ReturnBookUseCase {
  async execute(input) {
    await this.borrowService.returnBook(user, book);

    // ✅ Publish event, handlers will respond
    const event = new BookAvailableEvent(book.id);
    publisher.publish(event);
  }
}

// Separate handler responds to event
class BookAvailableHandler {
  async handle(event: BookAvailableEvent) {
    const queueService = new ReservationQueueService(...);
    await queueService.notifyNextInQueue(event.bookId);
  }
}
```

## Key Takeaways

1. **Domain Events** - Decouple components through event-driven communication
2. **Event Publisher** - Singleton pattern for centralized event bus
3. **FIFO Queue** - Fair ordering based on reservation creation time
4. **Time-Based Logic** - 3-day expiration period with automatic processing
5. **Cascade Notifications** - Next user notified when previous expires
6. **Aggregate Root** - Reservation manages its own lifecycle
7. **Observer Pattern** - Subscribe to events without tight coupling
8. **Single Responsibility** - Each handler responds to one event type

## Comparison with Previous Lessons

| Aspect | Lesson 3 | Lesson 4 | Lesson 5 |
|--------|----------|----------|----------|
| **Core Concept** | Domain Services | Business Rules | Domain Events |
| **Coordination** | Multi-entity | Fee Calculation | Event-Driven |
| **Coupling** | Direct calls | Direct calls | Events (loose) ⭐ |
| **New Patterns** | Domain Service | Time-based logic | Publisher/Subscriber ⭐ |
| **Aggregates** | 2 (User, Book) | 2 (User, Book) | 3 (+ Reservation) ⭐ |
| **Events** | None | None | Multiple events ⭐ |
| **Queue Management** | No | No | Yes (FIFO) ⭐ |
| **Async Handling** | No | No | Yes (events) ⭐ |
| **Complexity** | High | Very High | Extremely High ⭐ |

## Architecture Principles Applied

### 1. Event-Driven Architecture
- Components communicate through events
- Loose coupling between modules
- Easy to add new event handlers

### 2. Domain-Driven Design
- Domain events represent important occurrences
- Ubiquitous language (Reserved, Ready, Expired, Fulfilled)
- Rich domain models with behavior

### 3. Observer Pattern
- Event publisher maintains list of subscribers
- Subscribers notified automatically
- Decoupled notification system

### 4. Single Responsibility
- Each event handler handles one event type
- Queue service manages queue operations
- Event publisher manages subscriptions

### 5. Open/Closed Principle
- Easy to add new event types
- New handlers added without modifying existing code
- Event system extensible

## Next Steps

After mastering Lesson 5, you'll be ready for:
- **Lesson 6**: Integration Testing and Refactoring

## Resources

- [Domain Events - DDD](https://martinfowler.com/eaaDev/DomainEvent.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [Queue Management](https://en.wikipedia.org/wiki/FIFO_(computing_and_electronics))

---

**Expected Score Range**: 95-100
**Pass Criteria**: Score ≥ 60 with no ERROR violations
**Key Focus**: Domain events, event-driven architecture, queue management, loose coupling

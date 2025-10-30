# Clean Architecture Lessons - Quick Summary

## Lesson 1: Todo Entity - Basic Clean Architecture

**Core Concept:** Basic layer separation and dependency injection

### Key Files
- `Todo.ts` - Domain entity with validation
- `ITodoRepository.ts` - Repository interface
- `CreateTodoUseCase.ts` - Business logic orchestration
- `InMemoryTodoRepository.ts` - Infrastructure implementation
- `TodoController.ts` - Presentation layer
- `main.ts` - Composition root

### Key Principles
- ✅ **Repository Pattern** - Abstract data access behind interfaces
- ✅ **Dependency Injection** - Constructor injection, no direct instantiation
- ✅ **Factory Methods** - `Todo.create()` for entity creation
- ✅ **Self-Validation** - Entities validate their own state
- ✅ **Layer Separation** - Domain → Application → Infrastructure → Presentation

### Common Violation Fixed
```typescript
// ❌ BAD: Direct instantiation
const repository = new InMemoryTodoRepository();

// ✅ GOOD: Constructor injection
constructor(private readonly todoRepository: ITodoRepository)
```

---

## Lesson 2: User Entity - Value Objects and Rich Domain Models

**Core Concept:** Value objects and rich domain behavior (avoid anemic models)

### Key Files
- `UserId.ts` - Value object (8-digit validation)
- `User.ts` - Rich entity with business rules
- `IUserRepository.ts` - Repository interface
- `CreateUserUseCase.ts` - User creation with duplicate check
- `InMemoryUserRepository.ts` - Infrastructure implementation
- `UserController.ts` - Presentation layer

### Key Principles
- ✅ **Value Objects** - Immutable, defined by attributes (UserId)
- ✅ **Rich Domain Models** - Entities contain behavior, not just data
- ✅ **Immutability** - State changes return new instances
- ✅ **Business Rules** - MAX_BORROW_LIMIT = 5, overdue fees
- ✅ **Domain Methods** - `canBorrow()`, `borrowBook()`, `suspend()`

### Business Logic in Entity
```typescript
static readonly MAX_BORROW_LIMIT = 5;

canBorrow(): boolean {
  if (this.status === UserStatus.SUSPENDED) return false;
  if (this.currentBorrowCount >= User.MAX_BORROW_LIMIT) return false;
  if (this.overdueFees > 0) return false;
  return true;
}

borrowBook(): User {
  if (!this.canBorrow()) throw new Error('Cannot borrow');
  return new User(/* ...new state with incremented count */);
}
```

---

## Lesson 3: Domain Services and Multi-Entity Operations

**Core Concept:** Domain services for multi-entity coordination

### Key Files
- `BookId.ts` - Value object (10-char alphanumeric)
- `Book.ts` - Entity with status management
- `IBookRepository.ts` - Repository interface
- **`BorrowBookService.ts`** ⭐ **DOMAIN SERVICE**
- `BorrowBookUseCase.ts` - Application orchestration
- `CreateBookUseCase.ts` - Book creation
- `InMemoryBookRepository.ts` - Infrastructure implementation
- `BookController.ts` - Presentation layer (dual repository injection)

### Key Principles
- ✅ **Domain Services** - Multi-entity business logic
- ✅ **Multi-Entity Coordination** - User + Book state changes
- ✅ **Transaction Boundaries** - Atomic persistence
- ✅ **Complex Business Rules** - Overdue fees (¥100/day, 14-day limit)
- ✅ **Domain vs Application Services** - Clear separation of concerns

### Domain Service Pattern
```typescript
class BorrowBookService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {}

  async execute(user: User, book: Book): Promise<BorrowBookResult> {
    // 1. Validate (domain logic)
    if (!user.canBorrow()) return { success: false };
    if (!book.isAvailable()) return { success: false };

    // 2. Update states (immutable)
    const updatedUser = user.borrowBook();
    const updatedBook = book.borrow(user.id);

    // 3. Persist (transaction boundary)
    await this.userRepository.save(updatedUser);
    await this.bookRepository.save(updatedBook);

    return { success: true, updatedUser, updatedBook };
  }
}
```

### Use Case Delegates to Domain Service
```typescript
class BorrowBookUseCase {
  async execute(input: BorrowBookInput) {
    // Application concerns: Find entities
    const user = await this.userRepository.findById(userId);
    const book = await this.bookRepository.findById(bookId);

    // Domain concerns: Delegate to domain service
    return await this.borrowService.execute(user, book);
  }
}
```

---

## Lesson 4: Return Book Use Case with Advanced Fee Calculation

**Core Concept:** Complex business rule calculations and time-based domain logic

### Key Files
- `Book.ts` - **Updated:** New fee calculation methods ⭐
- `User.ts` - Updated: Fee handling in returnBook()
- `BorrowBookService.ts` - **Updated:** New return logic with fees ⭐
- **`ReturnBookUseCase.ts`** ⭐ **NEW USE CASE**
- `BookController.ts` - Updated: returnBook endpoint

### Key Principles
- ✅ **Complex Business Rules** - Multi-conditional fee calculation
- ✅ **Time-Based Logic** - Date calculations for overdue fees
- ✅ **Grace Periods** - First 3 days overdue are FREE
- ✅ **Fee Caps** - Maximum ¥1,000 regardless of duration
- ✅ **Domain Calculation** - Fee logic in Book entity, not use case
- ✅ **Edge Case Handling** - Boundaries, caps, and zero cases

### Fee Calculation Business Rules
```typescript
✅ Due Date: 14 days after borrowing
✅ Grace Period: First 3 overdue days FREE
✅ Fee Rate: ¥10 per day after grace period
✅ Maximum Cap: ¥1,000

Formula: min((overdueDays - 3) × ¥10, ¥1,000)
```

### Book Entity Fee Calculation
```typescript
class Book {
  calculateOverdueFee(): number {
    const overdueDays = this.getOverdueDays();

    // No fee if not overdue
    if (overdueDays === 0) return 0;

    // Grace period: first 3 days free
    const GRACE_PERIOD = 3;
    const FEE_PER_DAY = 10;
    const MAX_FEE = 1000;

    if (overdueDays <= GRACE_PERIOD) return 0;

    // Calculate fee after grace period
    const chargeableDays = overdueDays - GRACE_PERIOD;
    const calculatedFee = chargeableDays * FEE_PER_DAY;

    // Apply maximum cap
    return Math.min(calculatedFee, MAX_FEE);
  }
}
```

### Fee Calculation Examples
| Days Borrowed | Overdue Days | Fee Applied |
|--------------|--------------|-------------|
| 10 days | 0 | ¥0 (not overdue) |
| 15 days | 1 | ¥0 (grace period) |
| 17 days | 3 | ¥0 (grace period) |
| 18 days | 4 | ¥10 [(4-3) × ¥10] |
| 25 days | 11 | ¥80 [(11-3) × ¥10] |
| 150 days | 136 | ¥1,000 [capped] |

### Domain Service Integration
```typescript
class BorrowBookService {
  async returnBook(user: User, book: Book) {
    // Validate ownership
    if (!book.borrowedBy?.equals(user.id)) {
      return { success: false };
    }

    // Calculate fee using Book's domain logic
    const overdueFee = book.calculateOverdueFee();

    // Update user state with fee (immutable)
    const updatedUser = user.returnBook(overdueFee);

    // Update book state (immutable)
    const updatedBook = book.returnBook();

    // Persist changes
    await this.userRepository.save(updatedUser);
    await this.bookRepository.save(updatedBook);

    return { success: true, updatedUser, updatedBook, overdueFee };
  }
}
```

### ReturnBookUseCase
```typescript
class ReturnBookUseCase {
  async execute(input: ReturnBookInput) {
    // 1. Find entities
    const user = await this.userRepository.findById(userId);
    const book = await this.bookRepository.findById(bookId);

    // 2. Validate book is borrowed
    if (book.status !== BookStatus.BORROWED) {
      return { success: false, message: 'Not borrowed' };
    }

    // 3. Execute domain service
    const result = await this.borrowService.returnBook(user, book);

    // 4. Build user-friendly message with fee details
    const feeMessage = result.overdueFee > 0
      ? ` Overdue fee applied: ¥${result.overdueFee}`
      : '';

    return {
      success: true,
      message: `Book returned successfully.${feeMessage}`,
      overdueFee: result.overdueFee,
      user: { /* DTO */ },
      book: { /* DTO */ }
    };
  }
}
```

---

## Architecture Flow Across All Lessons

### Layer Dependencies
```
┌─────────────────────────────────────┐
│  Presentation (Controllers)         │
│  - TodoController                   │
│  - UserController                   │
│  - BookController                   │
└──────────────┬──────────────────────┘
               ↓ depends on
┌──────────────────────────────────────┐
│  Application (Use Cases)             │
│  - CreateTodoUseCase                 │
│  - CreateUserUseCase                 │
│  - BorrowBookUseCase                 │
│  - ReturnBookUseCase ⭐ (Lesson 4)   │
└──────────────┬───────────────────────┘
               ↓ depends on
┌──────────────────────────────────────┐
│  Domain (Entities, Services)         │
│  - Todo, User, Book                  │
│  - UserId, BookId                    │
│  - BorrowBookService ⭐               │
│  - Repository Interfaces             │
└──────────────┬───────────────────────┘
               ↑ implemented by
┌──────────────────────────────────────┐
│  Infrastructure (Implementations)    │
│  - InMemoryTodoRepository            │
│  - InMemoryUserRepository            │
│  - InMemoryBookRepository            │
└──────────────────────────────────────┘
```

### Composition Root (main.ts)
```typescript
// Infrastructure instances
const todoRepository = new InMemoryTodoRepository();
const userRepository = new InMemoryUserRepository();
const bookRepository = new InMemoryBookRepository();

// Inject into controllers
const todoController = new TodoController(todoRepository);
const userController = new UserController(userRepository);
const bookController = new BookController(bookRepository, userRepository);

export { todoController, userController, bookController };
```

---

## Key Takeaways

### Lesson 1 → Basic Structure
- Repository Pattern
- Dependency Injection
- Layer Separation
- Simple entities

### Lesson 2 → Rich Domain
- Value Objects
- Business logic in entities
- Immutability
- Self-validating domain models

### Lesson 3 → Coordination
- Domain Services
- Multi-entity operations
- Transaction boundaries
- Complex business rules

### Lesson 4 → Advanced Calculations
- Time-based domain logic
- Complex fee calculation
- Grace periods and fee caps
- Edge case handling
- Dedicated use cases

### Lesson 5 → Event-Driven Architecture
- Domain events
- Observer pattern (Publisher/Subscriber)
- FIFO queue management
- Loose coupling via events
- Automatic cascade notifications
- Event handlers

---

## Progression Table

| Aspect | Lesson 1 | Lesson 2 | Lesson 3 | Lesson 4 | Lesson 5 |
|--------|----------|----------|----------|----------|----------|
| **Entities** | 1 (Todo) | 1 (User) | 3 (User+Book+Todo) | 3 (User+Book+Todo) | 4 (+ Reservation) ⭐ |
| **Value Objects** | 0 | 1 (UserId) | 2 (UserId, BookId) | 2 (UserId, BookId) | 3 (+ ReservationId) ⭐ |
| **Domain Services** | 0 | 0 | 1 (BorrowBookService) | 1 (BorrowBookService) | 3 (+ ReservationQueue, EventPublisher) ⭐ |
| **Use Cases** | 1 | 1 | 2 | 3 (+ ReturnBook) | 5 (+ Reserve, Cancel) ⭐ |
| **Domain Events** | No | No | No | No | Yes (4 events) ⭐ |
| **Event Handlers** | No | No | No | No | Yes (BookAvailableHandler) ⭐ |
| **Complexity** | Simple | Medium | High | Very High | Extremely High ⭐ |
| **Coupling** | Direct | Direct | Direct | Direct | Event-driven (loose) ⭐ |
| **Queue Management** | No | No | No | No | Yes (FIFO) ⭐ |
| **State Changes** | Single | Single | Multi-entity | Multi-entity | Multi-entity + Events ⭐ |
| **Business Rules** | Basic | Rich | Complex | Advanced | Advanced + Async ⭐ |
| **Time-Based Logic** | No | No | Yes (overdue) | Yes (fees) | Yes (expiration) ⭐ |
| **Score Range** | 85-100 | 95-100 | 95-100 | 95-100 | 95-100 |

---

## File Structure Summary

```
src/
├── domain/
│   ├── entities/
│   │   ├── Todo.ts              # Lesson 1
│   │   ├── User.ts              # Lesson 2
│   │   └── Book.ts              # Lesson 3
│   ├── valueobjects/
│   │   ├── UserId.ts            # Lesson 2
│   │   └── BookId.ts            # Lesson 3
│   ├── services/
│   │   └── BorrowBookService.ts # Lesson 3 ⭐
│   └── repositories/
│       ├── ITodoRepository.ts
│       ├── IUserRepository.ts
│       └── IBookRepository.ts
├── application/usecases/
│   ├── CreateTodoUseCase.ts
│   ├── CreateUserUseCase.ts
│   ├── CreateBookUseCase.ts
│   ├── BorrowBookUseCase.ts     # Lesson 3 ⭐
│   ├── ReturnBookUseCase.ts     # Lesson 4 ⭐
│   ├── ReserveBookUseCase.ts    # Lesson 5 ⭐
│   └── CancelReservationUseCase.ts # Lesson 5 ⭐
├── application/handlers/
│   └── BookAvailableHandler.ts  # Lesson 5 ⭐
├── infrastructure/repositories/
│   ├── InMemoryTodoRepository.ts
│   ├── InMemoryUserRepository.ts
│   └── InMemoryBookRepository.ts
├── presentation/controllers/
│   ├── TodoController.ts
│   ├── UserController.ts
│   └── BookController.ts
└── main.ts                      # Composition Root
```

---

## Clean Architecture Compliance Checklist

### ✅ All Lessons Follow:
- [x] Dependency Rule (dependencies point inward)
- [x] Repository Pattern (interface abstraction)
- [x] Dependency Injection (constructor injection)
- [x] Immutability (state changes return new instances)
- [x] Self-Validation (entities validate themselves)
- [x] Single Responsibility (each class has one job)
- [x] Interface Segregation (minimal contracts)
- [x] Factory Methods (controlled object creation)
- [x] Domain-Driven Design (business logic in domain)
- [x] Clear Layer Boundaries (no layer violations)

---

**Total Implementation:**
- **12 Entities/Value Objects** (Todo, User, Book, Reservation + 3 VOs)
- **3 Domain Services** ⭐ (BorrowBookService, ReservationQueueService, DomainEventPublisher)
- **9 Use Cases** (+ ReserveBook, CancelReservation in Lesson 5)
- **4 Domain Events** ⭐ (BookReserved, BookAvailable, ReservationReady, ReservationExpired)
- **1 Event Handler** ⭐ (BookAvailableHandler)
- **4 Repository Interfaces**
- **4 Repository Implementations**
- **4 Controllers** (+ ReservationController in Lesson 5)
- **1 Composition Root** with Event Handler Initialization

**Expected Scores:**
- Lesson 1: 85-100
- Lesson 2: 95-100
- Lesson 3: 95-100
- Lesson 4: 95-100
- Lesson 5: 95-100 ⭐

All lessons pass with **≥60 score and 0 ERROR violations**.

---

## Lesson 4 Highlights

### What's New in Lesson 4
1. **Advanced Fee Calculation Logic** - Multi-conditional business rules
2. **Grace Period Implementation** - First 3 days overdue are FREE
3. **Fee Cap Application** - Maximum ¥1,000 limit
4. **Time-Based Calculations** - getDaysBorrowed(), getOverdueDays()
5. **Dedicated Return Use Case** - ReturnBookUseCase for clear separation
6. **Enhanced Domain Service** - Updated returnBook() with fee handling
7. **User-Friendly Messages** - Include fee details in responses

### Business Rule Complexity
- **Simple Rule (Lesson 3):** Overdue = days borrowed > 14
- **Complex Rule (Lesson 4):** Fee = min((overdueDays - gracePeriod) × rate, maxCap)

### Edge Cases Handled
✅ Not overdue → ¥0
✅ Within grace period (1-3 days) → ¥0
✅ After grace period → Calculated fee
✅ Extremely overdue → Capped at ¥1,000
✅ Book not borrowed → Error
✅ Wrong user → Ownership error

---

## Lesson 5: Domain Events and Reservation System

**Core Concept:** Event-driven architecture and loose coupling through domain events

### Key Files
- `Reservation.ts` - **NEW:** Reservation entity with expiration ⭐
- `ReservationId.ts` - **NEW:** Reservation ID value object ⭐
- **Domain Events:**
  - `IDomainEvent.ts` - Base event interface ⭐
  - `BookReservedEvent.ts` - Book reserved ⭐
  - `BookAvailableEvent.ts` - Book available ⭐
  - `ReservationReadyEvent.ts` - Reservation ready ⭐
  - `ReservationExpiredEvent.ts` - Reservation expired ⭐
- **`DomainEventPublisher.ts`** ⭐ **NEW: Event bus (Singleton)**
- **`ReservationQueueService.ts`** ⭐ **NEW: FIFO queue management**
- `IReservationRepository.ts` - Repository interface
- `InMemoryReservationRepository.ts` - Implementation
- **`ReserveBookUseCase.ts`** ⭐ **NEW USE CASE**
- **`CancelReservationUseCase.ts`** ⭐ **NEW USE CASE**
- **`BookAvailableHandler.ts`** ⭐ **NEW: Event handler**
- `ReturnBookUseCase.ts` - Updated: Publish events ⭐
- `ReservationController.ts` - NEW controller
- `main.ts` - Updated with event handling demo

### Key Principles
- ✅ **Domain Events** - Represent important domain occurrences
- ✅ **Event-Driven Architecture** - Components communicate via events
- ✅ **Observer Pattern** - Publisher/Subscriber for loose coupling
- ✅ **FIFO Queue Management** - Fair ordering for reservations
- ✅ **3-Day Hold Period** - Time-limited reservation availability
- ✅ **Automatic Expiration** - Background processing of expired reservations
- ✅ **Cascade Notifications** - Next user notified automatically
- ✅ **Loose Coupling** - Use cases don't know about reservation system

### Domain Event Flow
```typescript
1. User returns book
   ↓
2. ReturnBookUseCase publishes BookAvailableEvent
   ↓
3. DomainEventPublisher notifies all subscribers
   ↓
4. BookAvailableHandler receives event
   ↓
5. ReservationQueueService gets next in queue (FIFO)
   ↓
6. Reservation marked as READY (3-day countdown starts)
   ↓
7. ReservationReadyEvent published
   ↓
8. User notified: "Book is available! You have 3 days"
```

### Event Publisher Pattern (Observer)
```typescript
// Singleton event bus
class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, EventHandler[]>;

  subscribe(eventType: string, handler: EventHandler) {
    this.handlers.get(eventType).push(handler);
  }

  async publish(event: IDomainEvent) {
    const handlers = this.handlers.get(event.eventType);
    for (const handler of handlers) {
      await handler(event);
    }
  }
}

// Usage in use case
const event = new BookAvailableEvent(bookId);
await DomainEventPublisher.getInstance().publish(event);
```

### FIFO Queue Management
```typescript
class ReservationQueueService {
  async getNextInQueue(bookId: BookId): Reservation | null {
    const activeReservations =
      await this.repo.findActiveByBook(bookId);

    if (activeReservations.length === 0) return null;

    // FIFO: earliest createdAt first
    activeReservations.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    return activeReservations[0]; // First in line
  }

  async notifyNextInQueue(bookId: BookId) {
    const next = await this.getNextInQueue(bookId);
    if (!next) return;

    // Mark as ready (starts 3-day countdown)
    const ready = next.markAsReady();
    await this.repo.save(ready);

    // Publish notification event
    const event = new ReservationReadyEvent(...);
    await publisher.publish(event);
  }
}
```

### Reservation Lifecycle
```
┌──────────┐
│  ACTIVE  │ ← User reserves unavailable book
│  (Queue) │    Waiting in FIFO queue
└────┬─────┘
     │ Book becomes available
     ↓
┌──────────┐
│  READY   │ ← User's turn! 3-day countdown starts
│ (3 days) │    Can borrow now
└────┬─────┘
     │
     ├─→ User borrows → FULFILLED ✅
     │
     └─→ 3 days pass → EXPIRED ❌
                      → Next user notified
```

### Loose Coupling Benefit
```typescript
// ❌ BAD: Tight coupling
class ReturnBookUseCase {
  async execute(input) {
    await this.borrowService.returnBook(user, book);

    // ❌ Direct dependency on reservation system
    const reservationService = new ReservationService();
    await reservationService.notifyNext(book.id);
  }
}

// ✅ GOOD: Loose coupling via events
class ReturnBookUseCase {
  async execute(input) {
    await this.borrowService.returnBook(user, book);

    // ✅ Just publish event, handlers respond independently
    const event = new BookAvailableEvent(book.id);
    await publisher.publish(event);
  }
}

// Separate handler (can add more without changing use case)
class BookAvailableHandler {
  async handle(event: BookAvailableEvent) {
    await this.queueService.notifyNextInQueue(event.bookId);
  }
}
```

### Key Architectural Benefits

**1. Decoupling**
- ReturnBookUseCase doesn't know about reservations
- Easy to add new event handlers
- No circular dependencies

**2. Extensibility**
- Add email notifications → New handler
- Add logging → New handler
- Add metrics → New handler

**3. Testability**
- Test use cases without reservation system
- Mock event publisher
- Test handlers independently

**4. Single Responsibility**
- Each handler handles one event type
- Use cases focus on their core logic
- Event publisher manages subscriptions

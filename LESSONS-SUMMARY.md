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

### Lesson 6 → Testing & Quality
- Testing pyramid (70/20/10)
- Unit testing all layers
- Integration testing flows
- 80%+ test coverage
- Refactoring patterns
- Performance optimization
- Best practices

---

## Progression Table

| Aspect | Lesson 1 | Lesson 2 | Lesson 3 | Lesson 4 | Lesson 5 | Lesson 6 |
|--------|----------|----------|----------|----------|----------|----------|
| **Entities** | 1 (Todo) | 1 (User) | 3 (User+Book+Todo) | 3 (User+Book+Todo) | 4 (+ Reservation) | 4 (Same) |
| **Value Objects** | 0 | 1 (UserId) | 2 (UserId, BookId) | 2 (UserId, BookId) | 3 (+ ReservationId) | 3 (Same) |
| **Domain Services** | 0 | 0 | 1 (BorrowBookService) | 1 (BorrowBookService) | 3 (+ Queue, Publisher) | 3 (Same) |
| **Use Cases** | 1 | 1 | 2 | 3 (+ ReturnBook) | 5 (+ Reserve, Cancel) | 5 (Same) |
| **Domain Events** | No | No | No | No | Yes (4 events) | Yes (4 events) |
| **Event Handlers** | No | No | No | No | Yes (1 handler) | Yes (1 handler) |
| **Test Coverage** | None | None | None | None | None | 80%+ ⭐ |
| **Unit Tests** | No | No | No | No | No | Yes (70%) ⭐ |
| **Integration Tests** | No | No | No | No | No | Yes (20%) ⭐ |
| **E2E Tests** | No | No | No | No | No | Yes (10%) ⭐ |
| **Refactoring** | No | No | No | No | No | Yes ⭐ |
| **Complexity** | Simple | Medium | High | Very High | Extremely High | Extremely High |
| **Coupling** | Direct | Direct | Direct | Direct | Event-driven | Event-driven |
| **Queue Management** | No | No | No | No | Yes (FIFO) | Yes (FIFO) |
| **State Changes** | Single | Single | Multi-entity | Multi-entity | Multi + Events | Multi + Events |
| **Business Rules** | Basic | Rich | Complex | Advanced | Advanced + Async | Advanced + Tested ⭐ |
| **Score Range** | 85-100 | 95-100 | 95-100 | 95-100 | 95-100 | 95-100 |

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
- **12 Entities/Value Objects** (Todo, User, Book, Reservation + VOs)
- **3 Domain Services** ⭐ (BorrowBookService, ReservationQueueService, DomainEventPublisher)
- **9 Use Cases** (Create, Borrow, Return, Reserve, Cancel)
- **4 Domain Events** ⭐ (BookReserved, BookAvailable, ReservationReady, ReservationExpired)
- **1 Event Handler** ⭐ (BookAvailableHandler)
- **4 Repository Interfaces**
- **4 Repository Implementations**
- **4 Controllers** (Todo, User, Book, Reservation)
- **1 Composition Root** with Event Handler Initialization
- **Comprehensive Test Suite** ⭐ (Lesson 6)
  - Unit Tests (70%+ of test suite)
  - Integration Tests (20%+ of test suite)
  - E2E Tests (10%+ of test suite)
  - 80%+ Code Coverage

**Expected Scores:**
- Lesson 1: 85-100
- Lesson 2: 95-100
- Lesson 3: 95-100
- Lesson 4: 95-100
- Lesson 5: 95-100
- Lesson 6: 95-100 ⭐

All lessons pass with **≥60 score and 0 ERROR violations**.
Lesson 6 adds **80%+ test coverage** as quality metric.

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

---

## Lesson 6: Integration Testing and Refactoring

**Core Concept:** Comprehensive testing strategies and code quality improvement

### Key Concepts
- **Testing Pyramid** - Balance unit, integration, and E2E tests
- **Test Coverage** - Achieve 80%+ coverage on business logic
- **Unit Testing** - Test entities, services, and use cases in isolation
- **Integration Testing** - Test component interactions
- **Mocking & Stubbing** - Isolate units under test
- **Refactoring Patterns** - Improve code structure without changing behavior
- **Performance Optimization** - Identify and resolve bottlenecks

### Testing Strategy (70/20/10 Rule)
```
   /\
  /E2E\        10% - Few, slow, expensive (complete flows)
 /------\
/Integr.\     20% - Medium speed (multi-component)
/--------\
/ Unit    \   70% - Many, fast, cheap (isolated units)
/__________\
```

### What Gets Tested

**Domain Layer (Highest Priority):**
- ✅ Entity business logic and validation
- ✅ Value object validation rules
- ✅ Domain service coordination
- ✅ Event publishing logic
- ✅ Immutability guarantees

**Application Layer:**
- ✅ Use case orchestration
- ✅ Error handling
- ✅ Event handler behavior
- ✅ DTO transformations

**Infrastructure Layer (Lower Priority):**
- ⚠️ Repository implementations (often simple)
- ⚠️ In-memory storage operations

**Integration Tests:**
- ✅ Complete user flows (borrow → return)
- ✅ Event-driven workflows
- ✅ Multi-component interactions
- ✅ Transaction boundaries

### Example Tests

#### Entity Unit Test
```typescript
describe('Reservation Entity', () => {
  it('creates reservation with ACTIVE status', () => {
    const reservation = Reservation.create(userId, bookId);

    expect(reservation.status).toBe(ReservationStatus.ACTIVE);
    expect(reservation.expiresAt).toBeNull();
  });

  it('sets 3-day expiration when marked as ready', () => {
    const reservation = Reservation.create(userId, bookId);
    const ready = reservation.markAsReady();

    expect(ready.status).toBe(ReservationStatus.READY);

    const expectedExpiry = new Date();
    expectedExpiry.setDate(expectedExpiry.getDate() + 3);
    expect(ready.expiresAt!.getDate()).toBe(expectedExpiry.getDate());
  });

  it('maintains immutability on state changes', () => {
    const original = Reservation.create(userId, bookId);
    const ready = original.markAsReady();

    expect(original.status).toBe(ReservationStatus.ACTIVE);
    expect(ready.status).toBe(ReservationStatus.READY);
    expect(original).not.toBe(ready);
  });
});
```

#### Domain Service Test with Mocks
```typescript
describe('BorrowBookService', () => {
  let service: BorrowBookService;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockBookRepo: jest.Mocked<IBookRepository>;

  beforeEach(() => {
    mockUserRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      // ... other methods
    };

    mockBookRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      // ... other methods
    };

    service = new BorrowBookService(mockUserRepo, mockBookRepo);
  });

  it('saves both user and book when borrowing succeeds', async () => {
    const user = User.create('John', 'john@example.com');
    const book = Book.create('Test', 'Author', '1234567890123');

    await service.execute(user, book);

    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    expect(mockBookRepo.save).toHaveBeenCalledTimes(1);
    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ currentBorrowCount: 1 })
    );
  });

  it('does not save when user is not eligible', async () => {
    const suspendedUser = User.create('John', 'john@example.com').suspend();
    const book = Book.create('Test', 'Author', '1234567890123');

    const result = await service.execute(suspendedUser, book);

    expect(result.success).toBe(false);
    expect(mockUserRepo.save).not.toHaveBeenCalled();
    expect(mockBookRepo.save).not.toHaveBeenCalled();
  });
});
```

#### Integration Test (Complete Flow)
```typescript
describe('Book Borrowing Flow (Integration)', () => {
  it('complete flow: create → borrow → return', async () => {
    const userRepo = new InMemoryUserRepository();
    const bookRepo = new InMemoryBookRepository();
    const userController = new UserController(userRepo);
    const bookController = new BookController(bookRepo, userRepo);

    // 1. Create user
    const user = await userController.createUser({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(user.status).toBe('success');

    // 2. Create book
    const book = await bookController.createBook({
      title: 'Test Book',
      author: 'Author',
      isbn: '9780123456789',
    });
    expect(book.status).toBe('success');

    // 3. Borrow book
    const borrow = await bookController.borrowBook({
      userId: user.data.id,
      bookId: book.data.id,
    });
    expect(borrow.status).toBe('success');
    expect(borrow.data.user.currentBorrowCount).toBe(1);

    // 4. Return book
    const returned = await bookController.returnBook({
      userId: user.data.id,
      bookId: book.data.id,
    });
    expect(returned.status).toBe('success');
    expect(returned.data.user.currentBorrowCount).toBe(0);
  });
});
```

### Refactoring Patterns Applied

**1. Extract Common Validation**
- EmailValidator utility class
- Shared validation logic across entities

**2. Introduce Result Object**
- Consistent error handling pattern
- `Result<T>` wrapper with success/failure states

**3. Base Use Case Pattern**
- Shared entity finding logic
- `findUserOrFail()` and `findBookOrFail()` helpers

**4. Batch Operations**
- Process multiple items in single transaction
- Reduce database round-trips

### Performance Optimizations

**1. Query Optimization**
- Avoid N+1 queries with eager loading
- Use repository methods that fetch related data

**2. Caching**
- Reuse service instances in handlers
- Cache frequently accessed data

**3. Batch Operations**
- Save multiple entities in single operation
- Process collections efficiently

### Test Coverage Goals

```
Target: 80%+ overall coverage

Priority Areas:
✅ Domain Entities: 95%+
✅ Domain Services: 90%+
✅ Use Cases: 90%+
✅ Event System: 85%+
⚠️ Repositories: 70%+ (often simple CRUD)
⚠️ Controllers: 70%+ (thin layer)
```

### Testing Best Practices

**1. AAA Pattern (Arrange-Act-Assert)**
```typescript
test('example', () => {
  // Arrange - Set up test data
  const user = User.create('John', 'john@example.com');

  // Act - Execute the behavior
  const borrowed = user.borrowBook();

  // Assert - Verify the outcome
  expect(borrowed.currentBorrowCount).toBe(1);
});
```

**2. Test One Thing Per Test**
- Single assertion focus
- Clear failure messages
- Easy to maintain

**3. Descriptive Names**
- Explain what is being tested
- Include expected behavior
- Mention conditions

**4. Test Edge Cases**
- Boundary conditions
- Error scenarios
- Invalid inputs

### Key Benefits of Lesson 6

**1. Confidence**
- High test coverage ensures correctness
- Catch regressions early
- Safe refactoring

**2. Documentation**
- Tests show how to use components
- Examples of correct behavior
- Living documentation

**3. Design Feedback**
- Hard to test = bad design
- Tests drive better architecture
- Encourage loose coupling

**4. Maintainability**
- Easier to change code
- Refactoring is safe
- Code quality improves

# Lesson 3: Domain Services and Multi-Entity Operations

## Learning Objectives

- Understand when and how to use Domain Services
- Master multi-entity business operations
- Learn transaction coordination patterns
- Apply complex business logic across aggregates
- Implement immutable state changes across multiple entities
- Handle domain-level orchestration vs application-level orchestration

## Concepts Covered

### 1. Domain Services
Stateless services that contain domain logic that doesn't naturally belong to a single entity.

### 2. Multi-Entity Coordination
Operations that require changes to multiple entities in a coordinated way.

### 3. Aggregate Coordination
Managing state changes across different aggregates while maintaining consistency.

### 4. Domain vs Application Services
Understanding the distinction between domain logic and application orchestration.

### 5. Complex Business Rules
Implementing rules that span multiple entities and require validation from multiple sources.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Todo.ts                      # From Lesson 1
│   │   ├── User.ts                      # From Lesson 2
│   │   └── Book.ts                      # NEW: Book entity
│   ├── valueobjects/
│   │   ├── UserId.ts                    # From Lesson 2
│   │   └── BookId.ts                    # NEW: Book ID value object
│   ├── services/
│   │   └── BorrowBookService.ts         # NEW: Domain service ⭐
│   └── repositories/
│       ├── ITodoRepository.ts           # From Lesson 1
│       ├── IUserRepository.ts           # From Lesson 2
│       └── IBookRepository.ts           # NEW: Book repository interface
├── application/
│   └── usecases/
│       ├── CreateTodoUseCase.ts         # From Lesson 1
│       ├── CreateUserUseCase.ts         # From Lesson 2
│       ├── CreateBookUseCase.ts         # NEW: Create book
│       └── BorrowBookUseCase.ts         # NEW: Borrow book use case ⭐
├── infrastructure/
│   └── repositories/
│       ├── InMemoryTodoRepository.ts    # From Lesson 1
│       ├── InMemoryUserRepository.ts    # From Lesson 2
│       └── InMemoryBookRepository.ts    # NEW: Book repository
├── presentation/
│   └── controllers/
│       ├── TodoController.ts            # From Lesson 1
│       ├── UserController.ts            # From Lesson 2
│       └── BookController.ts            # NEW: Book controller
└── main.ts                              # Updated composition root ⭐
```

## Key Components

### Book Entity (`src/domain/entities/Book.ts`)

**Rich Domain Model with Status Management:**

#### Status Enum
```typescript
enum BookStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  MAINTENANCE = 'maintenance'
}
```

#### Key Features
```typescript
✅ Factory method: Book.create()
✅ Status validation
✅ Borrower tracking (UserId)
✅ Borrow/return timestamps
✅ Overdue calculation (14-day limit)
✅ Immutable state changes
✅ Business rule enforcement
```

#### Business Logic Methods
```typescript
isAvailable(): boolean           // Check if can be borrowed
borrow(userId): Book            // Mark as borrowed (immutable)
returnBook(): Book              // Mark as returned (immutable)
markAsMaintenance(): Book       // Set maintenance status
makeAvailable(): Book           // Return to circulation
isOverdue(): boolean            // Check if >14 days borrowed
getOverdueDays(): number        // Calculate overdue days
```

#### Immutability Example
```typescript
borrow(userId: UserId): Book {
  if (!this.isAvailable()) {
    throw new Error('Book is not available for borrowing');
  }

  return new Book(
    this.id,
    this.title,
    this.author,
    this.isbn,
    BookStatus.BORROWED,
    userId,              // ← New borrower
    new Date(),         // ← Borrow timestamp
    this.createdAt
  );
}
```

### BookId Value Object (`src/domain/valueobjects/BookId.ts`)

**10-Character Alphanumeric Identifier:**

```typescript
✅ Format: 10 uppercase alphanumeric characters (e.g., "A1B2C3D4E5")
✅ Validation: /^[A-Z0-9]{10}$/
✅ Factory: BookId.create(id)
✅ Generator: BookId.generate()
✅ Immutable and comparable
```

**Example Usage:**
```typescript
const bookId = BookId.create("BOOK123456");
const randomId = BookId.generate(); // e.g., "K7M9P2Q4X8"
```

### BorrowBookService - Domain Service ⭐ (`src/domain/services/BorrowBookService.ts`)

**THE CORE CONCEPT OF LESSON 3**

#### Why Domain Services?

Domain Services are used when:
1. An operation involves multiple entities
2. The logic doesn't naturally belong to one entity
3. Business rules require coordination between aggregates
4. The operation is a significant domain concept itself

#### Structure
```typescript
export class BorrowBookService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {}

  async execute(user: User, book: Book): Promise<BorrowBookResult>
  async returnBook(user: User, book: Book): Promise<BorrowBookResult>
}
```

#### Borrow Operation Flow

**Domain Service Coordination:**
```typescript
async execute(user: User, book: Book): Promise<BorrowBookResult> {
  // 1. Validate user eligibility (domain logic)
  if (!user.canBorrow()) {
    return { success: false, error: 'User not eligible' };
  }

  // 2. Validate book availability (domain logic)
  if (!book.isAvailable()) {
    return { success: false, error: 'Book not available' };
  }

  // 3. Update user state (immutable)
  const updatedUser = user.borrowBook();

  // 4. Update book state (immutable)
  const updatedBook = book.borrow(user.id);

  // 5. Persist both changes (transaction boundary)
  await this.userRepository.save(updatedUser);
  await this.bookRepository.save(updatedBook);

  return { success: true, updatedUser, updatedBook };
}
```

#### Return Operation with Overdue Fees

**Complex Business Logic:**
```typescript
async returnBook(user: User, book: Book): Promise<BorrowBookResult> {
  // 1. Validate ownership
  if (!book.borrowedBy?.equals(user.id)) {
    return { success: false, error: 'Not borrowed by this user' };
  }

  // 2. Calculate overdue fees if applicable
  let updatedUser = user.returnBook();
  if (book.isOverdue()) {
    const overdueDays = book.getOverdueDays();
    const feePerDay = 100; // ¥100 per day
    const overdueFee = overdueDays * feePerDay;
    updatedUser = updatedUser.addOverdueFee(overdueFee);
  }

  // 3. Update book state
  const updatedBook = book.returnBook();

  // 4. Persist changes
  await this.userRepository.save(updatedUser);
  await this.bookRepository.save(updatedBook);

  return { success: true, updatedUser, updatedBook };
}
```

### BorrowBookUseCase (`src/application/usecases/BorrowBookUseCase.ts`)

**Application Layer Orchestration:**

#### Responsibilities
- Find entities by ID
- Validate entities exist
- Delegate domain logic to domain service
- Transform domain results to DTOs
- Handle application-level errors

#### Structure
```typescript
export class BorrowBookUseCase {
  private borrowService: BorrowBookService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {
    // Initialize domain service
    this.borrowService = new BorrowBookService(
      userRepository,
      bookRepository
    );
  }

  async execute(input: BorrowBookInput): Promise<BorrowBookOutput>
}
```

#### Flow
```typescript
async execute(input: BorrowBookInput): Promise<BorrowBookOutput> {
  // 1. Find user (application concern)
  const userId = UserId.create(input.userId);
  const user = await this.userRepository.findById(userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // 2. Find book (application concern)
  const bookId = BookId.create(input.bookId);
  const book = await this.bookRepository.findById(bookId);
  if (!book) {
    return { success: false, message: 'Book not found' };
  }

  // 3. Execute domain service (domain logic)
  const result = await this.borrowService.execute(user, book);

  // 4. Transform to DTO (application concern)
  return {
    success: result.success,
    message: result.success ? 'Book borrowed successfully' : result.error!,
    user: result.updatedUser ? { /* DTO */ } : undefined,
    book: result.updatedBook ? { /* DTO */ } : undefined
  };
}
```

### BookController (`src/presentation/controllers/BookController.ts`)

**Presentation Layer Coordination:**

```typescript
export class BookController {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly userRepository: IUserRepository  // ← Multiple repos!
  ) {}

  async createBook(request: {...}): Promise<any>
  async borrowBook(request: {...}): Promise<any>
}
```

**Key Point:** Controller accepts **multiple repositories** because it creates use cases that need multiple repositories.

### Updated Composition Root (`src/main.ts`)

**Wiring Up Dependencies:**

```typescript
// Initialize repositories
const todoRepository = new InMemoryTodoRepository();
const userRepository = new InMemoryUserRepository();
const bookRepository = new InMemoryBookRepository();  // ← NEW

// Inject dependencies
const todoController = new TodoController(todoRepository);
const userController = new UserController(userRepository);
const bookController = new BookController(
  bookRepository,
  userRepository  // ← Book controller needs both!
);

// Example: Complete borrowing flow
async function main() {
  const userResult = await userController.createUser({...});
  const bookResult = await bookController.createBook({...});

  // Demonstrate domain service usage
  const borrowResult = await bookController.borrowBook({
    userId: userResult.data.id,
    bookId: bookResult.data.id
  });
}
```

## Domain Services vs Application Services

### Domain Service (BorrowBookService)
```typescript
✅ Contains domain logic
✅ Works with domain entities
✅ Enforces business rules
✅ Lives in domain layer
✅ Depends on repository interfaces (from domain)
✅ Returns domain objects
✅ Stateless but domain-focused

Example: Validates if user can borrow based on business rules
```

### Application Service (BorrowBookUseCase)
```typescript
✅ Orchestrates application flow
✅ Finds entities by ID
✅ Delegates to domain services
✅ Handles DTOs (Input/Output)
✅ Lives in application layer
✅ Coordinates multiple domain operations
✅ Returns presentation-friendly data

Example: Finds user and book, then delegates to domain service
```

## Layer Responsibilities

### Presentation Layer (BookController)
- Receive requests
- Validate input format
- Create use cases with repositories
- Return formatted responses

### Application Layer (BorrowBookUseCase)
- Find entities
- Validate entities exist
- Delegate to domain services
- Transform domain results to DTOs

### Domain Layer (BorrowBookService)
- Validate business rules
- Coordinate entity state changes
- Enforce domain invariants
- Apply complex business logic

### Infrastructure Layer (Repositories)
- Persist state changes
- Query for entities
- Implement domain interfaces

## Transaction Boundaries

### Explicit in Domain Service
```typescript
// Domain service coordinates the transaction
await this.userRepository.save(updatedUser);
await this.bookRepository.save(updatedBook);
```

**In Production:**
- Wrap in database transaction
- Ensure atomicity (both save or both rollback)
- Handle concurrency conflicts
- Implement retry logic

## Common Patterns

### ❌ Business Logic in Use Case
```typescript
// BAD: Domain logic in application layer
class BorrowBookUseCase {
  async execute(input) {
    const user = await this.userRepo.findById(input.userId);

    // ❌ Business rule in use case
    if (user.currentBorrowCount >= 5) {
      throw new Error('Max limit');
    }

    // ❌ Direct entity manipulation
    user.currentBorrowCount++;
    await this.userRepo.save(user);
  }
}
```

### ✅ Business Logic in Domain Service
```typescript
// GOOD: Domain logic in domain layer
class BorrowBookService {
  async execute(user: User, book: Book) {
    // ✅ Business rule in domain
    if (!user.canBorrow()) {
      return { success: false };
    }

    // ✅ Immutable state change
    const updatedUser = user.borrowBook();
    await this.userRepository.save(updatedUser);
  }
}

class BorrowBookUseCase {
  async execute(input) {
    // ✅ Just orchestration
    const user = await this.userRepo.findById(input.userId);
    const book = await this.bookRepo.findById(input.bookId);

    // ✅ Delegate to domain service
    return await this.borrowService.execute(user, book);
  }
}
```

## Testing Strategy

### Domain Service Tests
```typescript
test('borrowBook succeeds when user eligible and book available', async () => {
  const mockUserRepo = {
    save: jest.fn()
  };
  const mockBookRepo = {
    save: jest.fn()
  };

  const service = new BorrowBookService(mockUserRepo, mockBookRepo);
  const user = User.create('John', 'john@example.com');
  const book = Book.create('Clean Code', 'Robert Martin', '1234567890123');

  const result = await service.execute(user, book);

  expect(result.success).toBe(true);
  expect(mockUserRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({ currentBorrowCount: 1 })
  );
  expect(mockBookRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({ status: BookStatus.BORROWED })
  );
});

test('borrowBook fails when user suspended', async () => {
  const service = new BorrowBookService(mockUserRepo, mockBookRepo);
  const user = User.create('John', 'john@example.com').suspend();
  const book = Book.create('Clean Code', 'Robert Martin', '1234567890123');

  const result = await service.execute(user, book);

  expect(result.success).toBe(false);
  expect(result.error).toContain('not eligible');
});

test('returnBook applies overdue fees correctly', async () => {
  // Mock a book borrowed 20 days ago
  const borrowedAt = new Date();
  borrowedAt.setDate(borrowedAt.getDate() - 20);

  const book = new Book(
    BookId.generate(),
    'Clean Code',
    'Robert Martin',
    '1234567890123',
    BookStatus.BORROWED,
    user.id,
    borrowedAt,  // ← 20 days ago
    new Date()
  );

  const result = await service.returnBook(user, book);

  expect(result.success).toBe(true);
  // 20 - 14 = 6 days overdue
  // 6 * ¥100 = ¥600 fee
  expect(result.updatedUser?.overdueFees).toBe(600);
});
```

## When to Use Domain Services

### Use Domain Service When:
✅ Logic involves multiple entities
✅ Operation is a significant domain concept
✅ Logic doesn't naturally fit in one entity
✅ Need to coordinate state changes across aggregates
✅ Complex validation requires multiple entities

**Examples:**
- Transfer money between accounts
- Borrow book (User + Book)
- Process order (Order + Inventory + Payment)
- Schedule meeting (User + Room + Calendar)

### Use Entity Method When:
✅ Logic concerns only one entity
✅ State change is simple
✅ Validation uses only entity data

**Examples:**
- Complete a todo
- Suspend a user
- Mark book as maintenance

## Key Takeaways

1. **Domain Services** contain business logic that spans multiple entities
2. **Immutability** is maintained even in multi-entity operations
3. **Transaction Coordination** happens in domain services
4. **Use Cases** orchestrate, **Domain Services** contain business logic
5. **Controllers** can inject multiple repositories for complex operations
6. **Overdue Calculations** demonstrate time-based business rules
7. **State Validation** ensures entities remain consistent
8. **Clear Separation** between application and domain concerns

## Comparison with Previous Lessons

| Aspect | Lesson 1 (Todo) | Lesson 2 (User) | Lesson 3 (Book+Borrow) |
|--------|-----------------|-----------------|------------------------|
| Entities | 1 (Todo) | 1 (User) | 3 (User+Book+Todo) |
| Value Objects | None | UserId | BookId + UserId |
| Domain Services | None | None | BorrowBookService ⭐ |
| Multi-Entity Ops | No | No | Yes ⭐ |
| State Coordination | Single | Single | Multiple ⭐ |
| Business Complexity | Simple | Medium | High |
| Transaction Scope | Single save | Single save | Multiple saves ⭐ |

## Architecture Principles Applied

### 1. Dependency Rule
```
BookController (Presentation)
    ↓
BorrowBookUseCase (Application)
    ↓
BorrowBookService (Domain) ⭐
    ↓
IUserRepository + IBookRepository (Domain Interfaces)
    ↑
InMemoryUserRepo + InMemoryBookRepo (Infrastructure)
```

### 2. Single Responsibility
- **User**: Manages user state and borrowing eligibility
- **Book**: Manages book state and availability
- **BorrowBookService**: Coordinates borrowing operation
- **BorrowBookUseCase**: Application flow orchestration
- **BookController**: Request handling

### 3. Domain-Driven Design
- Rich domain models with behavior
- Domain services for multi-entity operations
- Ubiquitous language (Borrow, Return, Overdue)
- Aggregate boundaries respected

## Next Steps

After mastering Lesson 3, you'll be ready for:
- **Lesson 4**: Aggregates and Consistency Boundaries
- **Lesson 5**: Domain Events and Event-Driven Architecture
- **Lesson 6**: Integration Patterns and External Systems

## Resources

- [Domain Services - DDD](https://enterprisecraftsmanship.com/posts/domain-vs-application-services/)
- [Aggregates in DDD](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Transaction Boundaries](https://enterprisecraftsmanship.com/posts/aggregate-is-transaction-boundary/)
- [Multi-Entity Operations](https://stackoverflow.com/questions/14237375/domain-services-vs-application-services)

---

**Expected Score Range**: 95-100
**Pass Criteria**: Score ≥ 60 with no ERROR violations
**Key Focus**: Domain services, multi-entity coordination, transaction boundaries

# Lesson 6: Integration Testing and Refactoring

## Learning Objectives

- Master testing strategies across all architectural layers
- Achieve 80%+ test coverage
- Write unit tests, integration tests, and E2E tests
- Apply refactoring techniques to improve code quality
- Understand testing best practices in Clean Architecture
- Identify and eliminate code smells
- Optimize performance bottlenecks

## Concepts Covered

### 1. Testing Pyramid
Understanding the balance between unit tests, integration tests, and E2E tests for optimal coverage and speed.

### 2. Test-Driven Development (TDD)
Writing tests before implementation to drive design decisions and ensure testability.

### 3. Mocking and Stubbing
Isolating units under test by replacing dependencies with test doubles.

### 4. Integration Testing
Testing multiple components working together to verify correct interactions.

### 5. Test Coverage
Measuring which code paths are executed during tests to identify gaps.

### 6. Refactoring Patterns
Improving code structure without changing external behavior.

### 7. Performance Optimization
Identifying and resolving bottlenecks in critical paths.

## Testing Strategy Overview

```
          /\
         /  \
        / E2E \         ← Few, slow, expensive
       /--------\
      /          \
     / Integration \    ← Some, medium speed
    /--------------\
   /                \
  /   Unit Tests     \  ← Many, fast, cheap
 /____________________\
```

### Test Distribution (Recommended)
- **70% Unit Tests** - Fast, isolated, test single units
- **20% Integration Tests** - Medium speed, test component interactions
- **10% E2E Tests** - Slow, test complete user flows

## File Structure

```
__tests__/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Todo.test.ts
│   │   │   ├── User.test.ts
│   │   │   ├── Book.test.ts
│   │   │   └── Reservation.test.ts
│   │   ├── valueobjects/
│   │   │   ├── UserId.test.ts
│   │   │   ├── BookId.test.ts
│   │   │   └── ReservationId.test.ts
│   │   └── services/
│   │       ├── BorrowBookService.test.ts
│   │       ├── ReservationQueueService.test.ts
│   │       └── DomainEventPublisher.test.ts
│   ├── application/
│   │   ├── usecases/
│   │   │   ├── CreateTodoUseCase.test.ts
│   │   │   ├── BorrowBookUseCase.test.ts
│   │   │   ├── ReturnBookUseCase.test.ts
│   │   │   └── ReserveBookUseCase.test.ts
│   │   └── handlers/
│   │       └── BookAvailableHandler.test.ts
│   └── infrastructure/
│       └── repositories/
│           ├── InMemoryTodoRepository.test.ts
│           └── InMemoryReservationRepository.test.ts
├── integration/
│   ├── book-borrowing-flow.test.ts
│   ├── reservation-flow.test.ts
│   └── event-driven-flow.test.ts
└── e2e/
    ├── complete-library-flow.test.ts
    └── reservation-expiration.test.ts
```

## Unit Testing Examples

### Testing Entities

#### Todo Entity Tests (`__tests__/unit/domain/entities/Todo.test.ts`)

```typescript
import { Todo } from '../../../../src/domain/entities/Todo';

describe('Todo Entity', () => {
  describe('create', () => {
    it('creates todo with valid title', () => {
      const todo = Todo.create('Learn Clean Architecture', 'Study DDD patterns');

      expect(todo.title).toBe('Learn Clean Architecture');
      expect(todo.description).toBe('Study DDD patterns');
      expect(todo.isCompleted).toBe(false);
    });

    it('throws error when title is empty', () => {
      expect(() => Todo.create('', 'Description')).toThrow('Title cannot be empty');
    });

    it('throws error when title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => Todo.create(longTitle, 'Description')).toThrow(
        'Title cannot exceed 200 characters'
      );
    });
  });

  describe('markAsCompleted', () => {
    it('marks todo as completed', () => {
      const todo = Todo.create('Test task', 'Description');
      const completed = todo.markAsCompleted();

      expect(completed.isCompleted).toBe(true);
      expect(todo.isCompleted).toBe(false); // Immutability check
    });

    it('throws error when already completed', () => {
      const todo = Todo.create('Test task', 'Description');
      const completed = todo.markAsCompleted();

      expect(() => completed.markAsCompleted()).toThrow('Todo is already completed');
    });
  });

  describe('immutability', () => {
    it('returns new instance on state change', () => {
      const original = Todo.create('Test', 'Description');
      const modified = original.markAsCompleted();

      expect(original).not.toBe(modified);
      expect(original.isCompleted).toBe(false);
      expect(modified.isCompleted).toBe(true);
    });
  });
});
```

#### Reservation Entity Tests (`__tests__/unit/domain/entities/Reservation.test.ts`)

```typescript
import { Reservation, ReservationStatus } from '../../../../src/domain/entities/Reservation';
import { UserId } from '../../../../src/domain/valueobjects/UserId';
import { BookId } from '../../../../src/domain/valueobjects/BookId';

describe('Reservation Entity', () => {
  let userId: UserId;
  let bookId: BookId;

  beforeEach(() => {
    userId = UserId.generate();
    bookId = BookId.generate();
  });

  describe('create', () => {
    it('creates reservation with ACTIVE status', () => {
      const reservation = Reservation.create(userId, bookId);

      expect(reservation.status).toBe(ReservationStatus.ACTIVE);
      expect(reservation.userId).toBe(userId);
      expect(reservation.bookId).toBe(bookId);
      expect(reservation.readyAt).toBeNull();
      expect(reservation.expiresAt).toBeNull();
    });
  });

  describe('markAsReady', () => {
    it('transitions from ACTIVE to READY', () => {
      const reservation = Reservation.create(userId, bookId);
      const ready = reservation.markAsReady();

      expect(ready.status).toBe(ReservationStatus.READY);
      expect(ready.readyAt).toBeDefined();
      expect(ready.expiresAt).toBeDefined();
    });

    it('sets expiration 3 days from now', () => {
      const reservation = Reservation.create(userId, bookId);
      const ready = reservation.markAsReady();

      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 3);

      expect(ready.expiresAt!.getDate()).toBe(expectedExpiry.getDate());
    });

    it('throws error when not ACTIVE', () => {
      const reservation = Reservation.create(userId, bookId);
      const ready = reservation.markAsReady();

      expect(() => ready.markAsReady()).toThrow('Only active reservations');
    });
  });

  describe('isExpired', () => {
    it('returns false for ACTIVE reservation', () => {
      const reservation = Reservation.create(userId, bookId);
      expect(reservation.isExpired()).toBe(false);
    });

    it('returns false for READY reservation within 3 days', () => {
      const reservation = Reservation.create(userId, bookId);
      const ready = reservation.markAsReady();

      expect(ready.isExpired()).toBe(false);
    });

    it('returns true for READY reservation after 3 days', () => {
      // Create expired reservation (simulate 4 days ago)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 4);

      const expiredReservation = Reservation.restore(
        reservation.id,
        userId,
        bookId,
        ReservationStatus.READY,
        pastDate,
        pastDate,
        new Date(pastDate.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 days
      );

      expect(expiredReservation.isExpired()).toBe(true);
    });
  });
});
```

### Testing Domain Services

#### BorrowBookService Tests

```typescript
import { BorrowBookService } from '../../../../src/domain/services/BorrowBookService';
import { User, UserStatus } from '../../../../src/domain/entities/User';
import { Book, BookStatus } from '../../../../src/domain/entities/Book';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IBookRepository } from '../../../../src/domain/repositories/IBookRepository';

describe('BorrowBookService', () => {
  let service: BorrowBookService;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockBookRepo: jest.Mocked<IBookRepository>;
  let user: User;
  let book: Book;

  beforeEach(() => {
    // Create mock repositories
    mockUserRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    mockBookRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    service = new BorrowBookService(mockUserRepo, mockBookRepo);

    // Create test entities
    user = User.create('John Doe', 'john@example.com');
    book = Book.create('Clean Architecture', 'Robert Martin', '9780134494166');
  });

  describe('execute (borrow book)', () => {
    it('successfully borrows book when user eligible and book available', async () => {
      const result = await service.execute(user, book);

      expect(result.success).toBe(true);
      expect(result.updatedUser!.currentBorrowCount).toBe(1);
      expect(result.updatedBook!.status).toBe(BookStatus.BORROWED);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(mockBookRepo.save).toHaveBeenCalledTimes(1);
    });

    it('fails when user is suspended', async () => {
      const suspendedUser = user.suspend();

      const result = await service.execute(suspendedUser, book);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not eligible');
      expect(mockUserRepo.save).not.toHaveBeenCalled();
      expect(mockBookRepo.save).not.toHaveBeenCalled();
    });

    it('fails when user has reached borrow limit', async () => {
      let limitUser = user;
      for (let i = 0; i < 5; i++) {
        limitUser = limitUser.borrowBook();
      }

      const result = await service.execute(limitUser, book);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not eligible');
    });

    it('fails when book is not available', async () => {
      const borrowedBook = book.borrow(user.id);

      const result = await service.execute(user, borrowedBook);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('maintains immutability - does not modify original entities', async () => {
      const originalUserCount = user.currentBorrowCount;
      const originalBookStatus = book.status;

      await service.execute(user, book);

      expect(user.currentBorrowCount).toBe(originalUserCount);
      expect(book.status).toBe(originalBookStatus);
    });
  });

  describe('returnBook', () => {
    let borrowedBook: Book;
    let borrowingUser: User;

    beforeEach(() => {
      borrowingUser = user.borrowBook();
      borrowedBook = book.borrow(user.id);
    });

    it('successfully returns book with no overdue fees', async () => {
      const result = await service.returnBook(borrowingUser, borrowedBook);

      expect(result.success).toBe(true);
      expect(result.overdueFee).toBe(0);
      expect(result.updatedUser!.currentBorrowCount).toBe(0);
      expect(result.updatedBook!.status).toBe(BookStatus.AVAILABLE);
    });

    it('applies overdue fees when book is overdue', async () => {
      // Create overdue book (borrowed 20 days ago)
      const borrowedAt = new Date();
      borrowedAt.setDate(borrowedAt.getDate() - 20);

      const overdueBook = Book.restore(
        book.id,
        book.title,
        book.author,
        book.isbn,
        BookStatus.BORROWED,
        user.id,
        borrowedAt,
        book.createdAt
      );

      const result = await service.returnBook(borrowingUser, overdueBook);

      expect(result.success).toBe(true);
      // 20 days - 14 due date = 6 days overdue
      // 6 - 3 grace = 3 chargeable days
      // 3 × ¥10 = ¥30
      expect(result.overdueFee).toBe(30);
      expect(result.updatedUser!.overdueFees).toBe(30);
    });

    it('fails when book not borrowed by this user', async () => {
      const otherUser = User.create('Jane', 'jane@example.com');
      const otherUserBorrowing = otherUser.borrowBook();

      const result = await service.returnBook(otherUserBorrowing, borrowedBook);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not borrowed by this user');
    });
  });
});
```

### Testing Use Cases

#### BorrowBookUseCase Tests

```typescript
import { BorrowBookUseCase } from '../../../../src/application/usecases/BorrowBookUseCase';
import { User } from '../../../../src/domain/entities/User';
import { Book } from '../../../../src/domain/entities/Book';
import { UserId } from '../../../../src/domain/valueobjects/UserId';
import { BookId } from '../../../../src/domain/valueobjects/BookId';

describe('BorrowBookUseCase', () => {
  let useCase: BorrowBookUseCase;
  let mockUserRepo: any;
  let mockBookRepo: any;
  let user: User;
  let book: Book;

  beforeEach(() => {
    user = User.create('John', 'john@example.com');
    book = Book.create('Test Book', 'Author', '9780123456789');

    mockUserRepo = {
      findById: jest.fn().mockResolvedValue(user),
      save: jest.fn(),
    };

    mockBookRepo = {
      findById: jest.fn().mockResolvedValue(book),
      save: jest.fn(),
    };

    useCase = new BorrowBookUseCase(mockUserRepo, mockBookRepo);
  });

  it('successfully borrows book', async () => {
    const result = await useCase.execute({
      userId: user.id.getValue(),
      bookId: book.id.getValue(),
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully');
    expect(result.user).toBeDefined();
    expect(result.book).toBeDefined();
  });

  it('fails when user not found', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      userId: 'INVALID123',
      bookId: book.id.getValue(),
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not found');
  });

  it('fails when book not found', async () => {
    mockBookRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      userId: user.id.getValue(),
      bookId: 'INVALID',
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Book not found');
  });
});
```

### Testing Event System

#### DomainEventPublisher Tests

```typescript
import { DomainEventPublisher } from '../../../../src/domain/services/DomainEventPublisher';
import { BookAvailableEvent } from '../../../../src/domain/events/BookAvailableEvent';
import { BookId } from '../../../../src/domain/valueobjects/BookId';

describe('DomainEventPublisher', () => {
  let publisher: DomainEventPublisher;

  beforeEach(() => {
    publisher = DomainEventPublisher.getInstance();
    publisher.clearHandlers(); // Clean state for each test
  });

  it('is a singleton', () => {
    const instance1 = DomainEventPublisher.getInstance();
    const instance2 = DomainEventPublisher.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('publishes event to subscribers', async () => {
    const handler = jest.fn();
    const bookId = BookId.generate();
    const event = new BookAvailableEvent(bookId);

    publisher.subscribe('BookAvailable', handler);
    await publisher.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('publishes to multiple subscribers', async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const event = new BookAvailableEvent(BookId.generate());

    publisher.subscribe('BookAvailable', handler1);
    publisher.subscribe('BookAvailable', handler2);
    await publisher.publish(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('does not call handlers for different event types', async () => {
    const handler = jest.fn();
    publisher.subscribe('BookReserved', handler);

    const event = new BookAvailableEvent(BookId.generate());
    await publisher.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('continues executing other handlers if one fails', async () => {
    const handler1 = jest.fn(() => {
      throw new Error('Handler 1 failed');
    });
    const handler2 = jest.fn();

    publisher.subscribe('BookAvailable', handler1);
    publisher.subscribe('BookAvailable', handler2);

    const event = new BookAvailableEvent(BookId.generate());
    await publisher.publish(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled(); // Should still execute
  });
});
```

## Integration Testing

### Book Borrowing Flow Integration Test

```typescript
import { InMemoryUserRepository } from '../../../src/infrastructure/repositories/InMemoryUserRepository';
import { InMemoryBookRepository } from '../../../src/infrastructure/repositories/InMemoryBookRepository';
import { BookController } from '../../../src/presentation/controllers/BookController';
import { UserController } from '../../../src/presentation/controllers/UserController';

describe('Book Borrowing Flow (Integration)', () => {
  let userRepo: InMemoryUserRepository;
  let bookRepo: InMemoryBookRepository;
  let userController: UserController;
  let bookController: BookController;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    bookRepo = new InMemoryBookRepository();
    userController = new UserController(userRepo);
    bookController = new BookController(bookRepo, userRepo);
  });

  it('complete flow: create user, create book, borrow, return', async () => {
    // 1. Create user
    const userResult = await userController.createUser({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(userResult.status).toBe('success');
    const userId = userResult.data.id;

    // 2. Create book
    const bookResult = await bookController.createBook({
      title: 'Domain-Driven Design',
      author: 'Eric Evans',
      isbn: '9780321125217',
    });
    expect(bookResult.status).toBe('success');
    const bookId = bookResult.data.id;

    // 3. Borrow book
    const borrowResult = await bookController.borrowBook({
      userId,
      bookId,
    });
    expect(borrowResult.status).toBe('success');
    expect(borrowResult.data.user.currentBorrowCount).toBe(1);
    expect(borrowResult.data.book.status).toBe('borrowed');

    // 4. Return book
    const returnResult = await bookController.returnBook({
      userId,
      bookId,
    });
    expect(returnResult.status).toBe('success');
    expect(returnResult.data.user.currentBorrowCount).toBe(0);
    expect(returnResult.data.book.status).toBe('available');
  });

  it('prevents borrowing when user reaches limit', async () => {
    const userResult = await userController.createUser({
      name: 'Bob',
      email: 'bob@example.com',
    });
    const userId = userResult.data.id;

    // Borrow 5 books (limit)
    for (let i = 0; i < 5; i++) {
      const book = await bookController.createBook({
        title: `Book ${i}`,
        author: 'Author',
        isbn: `978012345678${i}`,
      });
      await bookController.borrowBook({
        userId,
        bookId: book.data.id,
      });
    }

    // Try to borrow 6th book
    const extraBook = await bookController.createBook({
      title: 'Extra Book',
      author: 'Author',
      isbn: '9780999999999',
    });

    const result = await bookController.borrowBook({
      userId,
      bookId: extraBook.data.id,
    });

    expect(result.status).toBe('error');
    expect(result.message).toContain('not eligible');
  });
});
```

### Reservation Flow Integration Test

```typescript
describe('Reservation Flow with Events (Integration)', () => {
  let userRepo: InMemoryUserRepository;
  let bookRepo: InMemoryBookRepository;
  let reservationRepo: InMemoryReservationRepository;
  let bookController: BookController;
  let userController: UserController;
  let reservationController: ReservationController;
  let eventHandler: BookAvailableHandler;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    bookRepo = new InMemoryBookRepository();
    reservationRepo = new InMemoryReservationRepository();

    userController = new UserController(userRepo);
    bookController = new BookController(bookRepo, userRepo);
    reservationController = new ReservationController(userRepo, bookRepo, reservationRepo);

    // Initialize event handler
    eventHandler = new BookAvailableHandler(reservationRepo);

    // Clear event handlers from previous tests
    DomainEventPublisher.getInstance().clearHandlers();
    // Re-initialize handler
    eventHandler = new BookAvailableHandler(reservationRepo);
  });

  it('notifies next user when book is returned', async () => {
    // 1. Create users
    const user1 = await userController.createUser({
      name: 'User 1',
      email: 'user1@example.com',
    });
    const user2 = await userController.createUser({
      name: 'User 2',
      email: 'user2@example.com',
    });

    // 2. Create book
    const book = await bookController.createBook({
      title: 'Test Book',
      author: 'Author',
      isbn: '9780111111111',
    });

    // 3. User 1 borrows book
    await bookController.borrowBook({
      userId: user1.data.id,
      bookId: book.data.id,
    });

    // 4. User 2 reserves book (goes into queue)
    const reserveResult = await reservationController.reserveBook({
      userId: user2.data.id,
      bookId: book.data.id,
    });
    expect(reserveResult.status).toBe('success');
    expect(reserveResult.data.queuePosition).toBe(1);

    // 5. User 1 returns book (triggers event)
    await bookController.returnBook({
      userId: user1.data.id,
      bookId: book.data.id,
    });

    // 6. Check that User 2's reservation is now READY
    const reservations = await reservationController.getUserReservations({
      userId: user2.data.id,
    });

    expect(reservations.data[0].status).toBe('ready');
    expect(reservations.data[0].remainingDays).toBe(3);
  });
});
```

## Test Coverage Measurement

### Running Tests with Coverage

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test file
npm test Todo.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Coverage Report

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
-------------------|---------|----------|---------|---------|-------------------
All files          |   92.45 |    88.23 |   94.12 |   92.89 |
 domain/entities   |   95.21 |    91.30 |   96.15 |   95.45 |
  Book.ts          |   96.55 |    93.75 |  100.00 |   96.77 | 145,167
  Reservation.ts   |   94.73 |    88.88 |   92.30 |   95.00 | 98,134
  Todo.ts          |   100.00 |   100.00 |  100.00 |  100.00 |
  User.ts          |   93.75 |    87.50 |   93.75 |   94.11 | 176,189
 domain/services   |   89.47 |    85.71 |   90.90 |   90.00 |
  BorrowBookService|   91.66 |    87.50 |   100.00 |   92.00 | 67,82
  ReservationQueue |   87.50 |    83.33 |   85.71 |   88.23 | 123,167,189
  EventPublisher   |   90.00 |    87.50 |   88.88 |   90.47 | 45,58
 application       |   91.23 |    86.66 |   92.85 |   91.67 |
-------------------|---------|----------|---------|---------|-------------------
```

### Achieving 80%+ Coverage

**Focus Areas:**
1. ✅ **Entities** - Test all business logic methods
2. ✅ **Value Objects** - Test validation rules
3. ✅ **Domain Services** - Test multi-entity coordination
4. ✅ **Use Cases** - Test happy paths and error cases
5. ✅ **Event System** - Test event publishing and handling
6. ⚠️ **Infrastructure** - Repository implementations (often simple, low priority)
7. ⚠️ **Presentation** - Controllers (thin layer, often covered by integration tests)

## Refactoring Opportunities

### 1. Extract Common Validation

**Before:**
```typescript
// Duplicated validation in multiple entities
class User {
  private validate() {
    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Invalid email');
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

class Contact {
  private validate() {
    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('Invalid email');
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

**After:**
```typescript
// Shared validation utility
class EmailValidator {
  static validate(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static ensureValid(email: string): void {
    if (!email || !this.validate(email)) {
      throw new Error('Invalid email address');
    }
  }
}

class User {
  private validate() {
    EmailValidator.ensureValid(this.email);
  }
}
```

### 2. Introduce Result Object

**Before:**
```typescript
// Using different result patterns
interface BorrowBookResult {
  success: boolean;
  error?: string;
  updatedUser?: User;
  updatedBook?: Book;
}

interface ReturnBookResult {
  success: boolean;
  message?: string;
  overdueFee?: number;
  user?: User;
  book?: Book;
}
```

**After:**
```typescript
// Consistent Result pattern
class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: string
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result(true, value);
  }

  static failure<T>(error: string): Result<T> {
    return new Result(false, undefined, error);
  }
}

// Usage
async execute(user: User, book: Book): Promise<Result<BorrowData>> {
  if (!user.canBorrow()) {
    return Result.failure('User not eligible');
  }

  return Result.success({ user, book });
}
```

### 3. Extract Repository Finder Methods

**Before:**
```typescript
// Duplicated findById logic in use cases
class BorrowBookUseCase {
  async execute(input) {
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    // ...
  }
}

class ReturnBookUseCase {
  async execute(input) {
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    // ...
  }
}
```

**After:**
```typescript
// Base use case with common finding logic
abstract class BaseUseCase {
  protected async findUserOrFail(userId: string): Promise<Result<User>> {
    const id = UserId.create(userId);
    const user = await this.userRepository.findById(id);

    if (!user) {
      return Result.failure('User not found');
    }

    return Result.success(user);
  }

  protected async findBookOrFail(bookId: string): Promise<Result<Book>> {
    const id = BookId.create(bookId);
    const book = await this.bookRepository.findById(id);

    if (!book) {
      return Result.failure('Book not found');
    }

    return Result.success(book);
  }
}

class BorrowBookUseCase extends BaseUseCase {
  async execute(input) {
    const userResult = await this.findUserOrFail(input.userId);
    if (!userResult.isSuccess) return userResult;

    const bookResult = await this.findBookOrFail(input.bookId);
    if (!bookResult.isSuccess) return bookResult;

    // Business logic here
  }
}
```

## Performance Optimization

### 1. Repository Query Optimization

**Before:**
```typescript
// N+1 query problem
async getAllUsersWithBooks() {
  const users = await userRepo.findAll();

  for (const user of users) {
    // N queries (one per user)
    user.books = await bookRepo.findByUserId(user.id);
  }

  return users;
}
```

**After:**
```typescript
// Single query with joins
async getAllUsersWithBooks() {
  const users = await userRepo.findAllWithBooks(); // Single query
  return users;
}
```

### 2. Caching Event Handlers

**Before:**
```typescript
// Handler created on every event
class BookAvailableHandler {
  async handle(event: BookAvailableEvent) {
    const queueService = new ReservationQueueService(repo); // Created each time
    await queueService.notifyNextInQueue(event.bookId);
  }
}
```

**After:**
```typescript
// Reuse service instance
class BookAvailableHandler {
  private queueService: ReservationQueueService;

  constructor(reservationRepo: IReservationRepository) {
    this.queueService = new ReservationQueueService(reservationRepo);
  }

  async handle(event: BookAvailableEvent) {
    await this.queueService.notifyNextInQueue(event.bookId);
  }
}
```

### 3. Batch Operations

**Before:**
```typescript
// Process reservations one by one
async processExpiredReservations() {
  const reservations = await repo.findByStatus(ReservationStatus.READY);

  for (const reservation of reservations) {
    if (reservation.isExpired()) {
      await repo.save(reservation.expire()); // N saves
    }
  }
}
```

**After:**
```typescript
// Batch save
async processExpiredReservations() {
  const reservations = await repo.findByStatus(ReservationStatus.READY);
  const expired = reservations
    .filter(r => r.isExpired())
    .map(r => r.expire());

  await repo.saveBatch(expired); // Single batch operation
}
```

## Testing Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
test('user can borrow book', () => {
  // Arrange
  const user = User.create('John', 'john@example.com');
  const book = Book.create('Test', 'Author', '1234567890123');

  // Act
  const borrowedUser = user.borrowBook();

  // Assert
  expect(borrowedUser.currentBorrowCount).toBe(1);
});
```

### 2. Test One Thing

```typescript
// ❌ BAD: Tests multiple things
test('user operations', () => {
  const user = User.create('John', 'john@example.com');
  expect(user.name).toBe('John');
  expect(user.canBorrow()).toBe(true);

  const borrowed = user.borrowBook();
  expect(borrowed.currentBorrowCount).toBe(1);
});

// ✅ GOOD: Separate tests
test('creates user with correct name', () => {
  const user = User.create('John', 'john@example.com');
  expect(user.name).toBe('John');
});

test('new user can borrow books', () => {
  const user = User.create('John', 'john@example.com');
  expect(user.canBorrow()).toBe(true);
});

test('borrowing increments count', () => {
  const user = User.create('John', 'john@example.com');
  const borrowed = user.borrowBook();
  expect(borrowed.currentBorrowCount).toBe(1);
});
```

### 3. Use Descriptive Test Names

```typescript
// ❌ BAD
test('test1', () => { /* ... */ });
test('user test', () => { /* ... */ });

// ✅ GOOD
test('throws error when email is invalid', () => { /* ... */ });
test('returns false when user is suspended', () => { /* ... */ });
test('applies fee cap when overdue exceeds maximum', () => { /* ... */ });
```

### 4. Test Edge Cases

```typescript
describe('Book.calculateOverdueFee', () => {
  test('returns 0 when not overdue', () => { /* ... */ });
  test('returns 0 within grace period (1 day)', () => { /* ... */ });
  test('returns 0 within grace period (3 days)', () => { /* ... */ });
  test('calculates fee after grace period (4 days)', () => { /* ... */ });
  test('applies maximum fee cap', () => { /* ... */ });
  test('handles boundary at exactly 14 days', () => { /* ... */ });
  test('handles boundary at exactly 17 days', () => { /* ... */ });
});
```

## Key Takeaways

1. **Testing Pyramid** - Balance unit, integration, and E2E tests
2. **80%+ Coverage** - Focus on business logic, not trivial code
3. **Test Behavior** - Not implementation details
4. **Mocking** - Isolate units under test
5. **Integration Tests** - Verify component interactions
6. **Refactoring** - Improve code without changing behavior
7. **Performance** - Identify and fix bottlenecks
8. **Best Practices** - AAA pattern, descriptive names, edge cases

## Resources

- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Clean Code: Testing](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Expected Score Range**: 95-100
**Pass Criteria**: Score ≥ 60 with 80%+ test coverage
**Key Focus**: Comprehensive testing, refactoring patterns, performance optimization

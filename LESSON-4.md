# Lesson 4: Return Book Use Case with Advanced Fee Calculation

## Learning Objectives

- Implement complex business rule calculations
- Master time-based domain logic
- Apply business rule layering and validation
- Understand fee calculation strategies
- Learn to handle edge cases in domain logic
- Coordinate state changes with calculated values

## Concepts Covered

### 1. Complex Business Rules
Implementing multi-conditional logic with business constraints (grace periods, caps, rate calculations).

### 2. Time-Based Domain Logic
Working with dates and time calculations in domain entities to determine business outcomes.

### 3. Value Calculation Strategies
Encapsulating calculation logic within domain services while keeping entities focused on state management.

### 4. Edge Case Handling
Managing boundary conditions (zero fees, maximum limits, grace periods) in business logic.

### 5. Immutable State with Calculated Values
Applying calculated values (fees) to entity state changes while maintaining immutability.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   ├── Book.ts                      # Updated: New fee calculation methods ⭐
│   │   └── User.ts                      # Updated: Fee handling ⭐
│   ├── services/
│   │   └── BorrowBookService.ts         # Updated: New return logic ⭐
│   └── repositories/
│       ├── IBookRepository.ts
│       └── IUserRepository.ts
├── application/
│   └── usecases/
│       ├── BorrowBookUseCase.ts
│       └── ReturnBookUseCase.ts         # NEW: Dedicated return use case ⭐
├── infrastructure/
│   └── repositories/
│       ├── InMemoryBookRepository.ts
│       └── InMemoryUserRepository.ts
├── presentation/
│   └── controllers/
│       └── BookController.ts            # Updated: Return book endpoint ⭐
└── main.ts                              # Updated: Demonstrate lesson 4 ⭐
```

## Key Components

### Overdue Fee Business Rules ⭐

**NEW RULES FOR LESSON 4:**

```typescript
✅ Fee Rate: ¥10 per day overdue
✅ Grace Period: First 3 days are FREE (no fee)
✅ Maximum Fee Cap: ¥1,000 (even if calculated fee is higher)
✅ Due Date: 14 days after borrowing
```

#### Fee Calculation Examples

| Days Borrowed | Overdue Days | Calculation | Fee Applied |
|--------------|--------------|-------------|-------------|
| 10 days | 0 | No overdue | ¥0 |
| 14 days | 0 | Due today | ¥0 |
| 15 days | 1 | Grace period | ¥0 |
| 16 days | 2 | Grace period | ¥0 |
| 17 days | 3 | Grace period | ¥0 |
| 18 days | 4 | (4-3) × ¥10 | ¥10 |
| 25 days | 11 | (11-3) × ¥10 | ¥80 |
| 50 days | 36 | (36-3) × ¥10 | ¥330 |
| 150 days | 136 | (136-3) × ¥10 = ¥1,330 → capped | ¥1,000 |

### Updated Book Entity (`src/domain/entities/Book.ts`)

**New Methods Added:**

#### getDaysBorrowed()
```typescript
/**
 * Get total days the book has been borrowed
 */
getDaysBorrowed(): number {
  if (this.status !== BookStatus.BORROWED || !this.borrowedAt) {
    return 0;
  }

  return Math.floor(
    (Date.now() - this.borrowedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
}
```

#### getOverdueDays()
```typescript
/**
 * Calculate overdue days beyond the 14-day limit
 * Returns 0 if not overdue
 */
getOverdueDays(): number {
  const daysBorrowed = this.getDaysBorrowed();
  const dueDate = 14; // 14-day borrowing period

  if (daysBorrowed <= dueDate) {
    return 0;
  }

  return daysBorrowed - dueDate;
}
```

#### calculateOverdueFee() ⭐
```typescript
/**
 * Calculate overdue fee based on business rules
 * - ¥10 per day after grace period
 * - First 3 days overdue are free (grace period)
 * - Maximum fee capped at ¥1,000
 */
calculateOverdueFee(): number {
  const overdueDays = this.getOverdueDays();

  // No fee if not overdue
  if (overdueDays === 0) {
    return 0;
  }

  // Grace period: first 3 days are free
  const GRACE_PERIOD = 3;
  const FEE_PER_DAY = 10; // ¥10 per day
  const MAX_FEE = 1000;   // ¥1,000 maximum

  if (overdueDays <= GRACE_PERIOD) {
    return 0;
  }

  // Calculate fee after grace period
  const chargeableDays = overdueDays - GRACE_PERIOD;
  const calculatedFee = chargeableDays * FEE_PER_DAY;

  // Apply maximum cap
  return Math.min(calculatedFee, MAX_FEE);
}
```

**Why in Book Entity?**
- Book knows when it was borrowed
- Book knows the borrowing period rules
- Book can calculate its own overdue status
- Keeps time-based logic centralized
- Single source of truth for fee calculation

### Updated BorrowBookService (`src/domain/services/BorrowBookService.ts`)

**Updated Return Logic:**

```typescript
async returnBook(user: User, book: Book): Promise<BorrowBookResult> {
  // 1. Validate ownership
  if (!book.borrowedBy || !book.borrowedBy.equals(user.id)) {
    return {
      success: false,
      error: 'Book is not borrowed by this user',
    };
  }

  try {
    // 2. Calculate overdue fee using Book's domain logic
    const overdueFee = book.calculateOverdueFee();

    // 3. Update user state with calculated fee (immutable)
    const updatedUser = user.returnBook(overdueFee);

    // 4. Update book state (immutable)
    const updatedBook = book.returnBook();

    // 5. Persist both changes (transaction boundary)
    await this.userRepository.save(updatedUser);
    await this.bookRepository.save(updatedBook);

    return {
      success: true,
      updatedUser,
      updatedBook,
      overdueFee, // Return fee for presentation layer
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Key Changes:**
1. ✅ Uses `book.calculateOverdueFee()` for domain logic
2. ✅ Passes fee directly to `user.returnBook(overdueFee)`
3. ✅ Returns fee amount for presentation layer
4. ✅ Maintains immutability throughout

### ReturnBookUseCase ⭐ (`src/application/usecases/ReturnBookUseCase.ts`)

**NEW: Dedicated Use Case for Book Returns**

#### Purpose
- Separate return logic from borrowing logic
- Clear single responsibility
- Easier to test and maintain
- Better error messaging

#### Structure
```typescript
export interface ReturnBookInput {
  userId: string;
  bookId: string;
}

export interface ReturnBookOutput {
  success: boolean;
  message: string;
  overdueFee?: number;
  user?: {
    id: string;
    name: string;
    currentBorrowCount: number;
    overdueFees: number;
  };
  book?: {
    id: string;
    title: string;
    status: string;
  };
}

export class ReturnBookUseCase {
  private borrowService: BorrowBookService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {
    this.borrowService = new BorrowBookService(
      userRepository,
      bookRepository
    );
  }

  async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
    // 1. Find user by ID
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // 2. Find book by ID
    const bookId = BookId.create(input.bookId);
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      return {
        success: false,
        message: 'Book not found',
      };
    }

    // 3. Validate book is borrowed
    if (book.status !== BookStatus.BORROWED) {
      return {
        success: false,
        message: 'Book is not currently borrowed',
      };
    }

    // 4. Execute domain service
    const result = await this.borrowService.returnBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to return book',
      };
    }

    // 5. Build success response with fee information
    const feeMessage = result.overdueFee && result.overdueFee > 0
      ? ` Overdue fee applied: ¥${result.overdueFee}`
      : '';

    return {
      success: true,
      message: `Book returned successfully.${feeMessage}`,
      overdueFee: result.overdueFee || 0,
      user: result.updatedUser ? {
        id: result.updatedUser.id.value,
        name: result.updatedUser.name,
        currentBorrowCount: result.updatedUser.currentBorrowCount,
        overdueFees: result.updatedUser.overdueFees,
      } : undefined,
      book: result.updatedBook ? {
        id: result.updatedBook.id.value,
        title: result.updatedBook.title,
        status: result.updatedBook.status,
      } : undefined,
    };
  }
}
```

**Responsibilities:**
- ✅ Find and validate entities exist
- ✅ Validate book is in borrowable state
- ✅ Delegate to domain service
- ✅ Format user-friendly messages with fee details
- ✅ Transform domain objects to DTOs

### Updated BookController (`src/presentation/controllers/BookController.ts`)

**New Return Book Endpoint:**

```typescript
async returnBook(request: {
  userId: string;
  bookId: string;
}): Promise<any> {
  const useCase = new ReturnBookUseCase(
    this.userRepository,
    this.bookRepository
  );

  const result = await useCase.execute(request);

  return {
    success: result.success,
    message: result.message,
    data: result.success ? {
      overdueFee: result.overdueFee,
      user: result.user,
      book: result.book,
    } : null,
  };
}
```

### Updated BorrowBookResult Interface

```typescript
export interface BorrowBookResult {
  success: boolean;
  updatedUser?: User;
  updatedBook?: Book;
  overdueFee?: number;  // NEW: Include fee in result ⭐
  error?: string;
}
```

## Layer Responsibilities in Lesson 4

### Domain Layer (Book Entity)
- ✅ Calculate days borrowed
- ✅ Determine overdue days
- ✅ Calculate overdue fees with business rules
- ✅ Encapsulate time-based logic
- ✅ Apply grace period and fee caps

### Domain Layer (BorrowBookService)
- ✅ Validate book ownership
- ✅ Call entity's fee calculation
- ✅ Coordinate state changes
- ✅ Persist both user and book updates
- ✅ Return calculated fee for upper layers

### Application Layer (ReturnBookUseCase)
- ✅ Find entities by ID
- ✅ Validate entities exist
- ✅ Validate book status
- ✅ Delegate to domain service
- ✅ Format fee messages for users
- ✅ Transform to DTOs

### Presentation Layer (BookController)
- ✅ Receive return requests
- ✅ Create use case instance
- ✅ Return formatted responses with fee details

## Business Rule Layering

### Level 1: Entity (Book.calculateOverdueFee)
```typescript
✅ FEE_PER_DAY = ¥10
✅ GRACE_PERIOD = 3 days
✅ MAX_FEE = ¥1,000
✅ DUE_DATE = 14 days
```

### Level 2: Domain Service (BorrowBookService.returnBook)
```typescript
✅ Call entity's fee calculation
✅ Apply fee to user state
✅ Coordinate updates
```

### Level 3: Use Case (ReturnBookUseCase)
```typescript
✅ Entity lookup
✅ Status validation
✅ Message formatting
```

## Testing Strategy

### Book Entity Tests
```typescript
describe('Book.calculateOverdueFee', () => {
  test('returns 0 when book is not overdue', () => {
    const book = createBookBorrowedDaysAgo(10);
    expect(book.calculateOverdueFee()).toBe(0);
  });

  test('returns 0 within grace period (1-3 days overdue)', () => {
    const book = createBookBorrowedDaysAgo(15); // 1 day overdue
    expect(book.calculateOverdueFee()).toBe(0);

    const book2 = createBookBorrowedDaysAgo(17); // 3 days overdue
    expect(book2.calculateOverdueFee()).toBe(0);
  });

  test('calculates fee after grace period', () => {
    const book = createBookBorrowedDaysAgo(18); // 4 days overdue
    // 4 days overdue - 3 grace = 1 chargeable day
    // 1 × ¥10 = ¥10
    expect(book.calculateOverdueFee()).toBe(10);
  });

  test('applies fee cap at ¥1,000', () => {
    const book = createBookBorrowedDaysAgo(200); // 186 days overdue
    // 186 - 3 = 183 chargeable days
    // 183 × ¥10 = ¥1,830 → capped at ¥1,000
    expect(book.calculateOverdueFee()).toBe(1000);
  });

  test('calculates exact fee at various overdue periods', () => {
    // 11 days overdue: (11-3) × 10 = ¥80
    expect(createBookBorrowedDaysAgo(25).calculateOverdueFee()).toBe(80);

    // 20 days overdue: (20-3) × 10 = ¥170
    expect(createBookBorrowedDaysAgo(34).calculateOverdueFee()).toBe(170);

    // 50 days overdue: (50-3) × 10 = ¥470
    expect(createBookBorrowedDaysAgo(64).calculateOverdueFee()).toBe(470);
  });
});
```

### ReturnBookUseCase Tests
```typescript
test('successfully returns book with no fees', async () => {
  const result = await useCase.execute({
    userId: 'U0000001',
    bookId: 'BOOK123456',
  });

  expect(result.success).toBe(true);
  expect(result.overdueFee).toBe(0);
  expect(result.message).toContain('successfully');
});

test('applies overdue fee when returning late', async () => {
  // Setup book borrowed 25 days ago (11 days overdue)
  const result = await useCase.execute({
    userId: 'U0000001',
    bookId: 'OVERDUEBOOK1',
  });

  expect(result.success).toBe(true);
  expect(result.overdueFee).toBe(80); // (11-3) × ¥10
  expect(result.message).toContain('¥80');
});

test('fails when book not borrowed by user', async () => {
  const result = await useCase.execute({
    userId: 'WRONGUSER',
    bookId: 'BOOK123456',
  });

  expect(result.success).toBe(false);
  expect(result.message).toContain('not borrowed by this user');
});
```

## Common Patterns

### ❌ Calculation Logic in Use Case
```typescript
// BAD: Business logic in application layer
class ReturnBookUseCase {
  async execute(input) {
    const book = await this.bookRepo.findById(input.bookId);

    // ❌ Fee calculation in use case
    const overdueDays = Math.floor(
      (Date.now() - book.borrowedAt.getTime()) / 86400000
    );
    const fee = overdueDays > 3 ? (overdueDays - 3) * 10 : 0;

    const updatedUser = user.returnBook(fee);
  }
}
```

### ✅ Calculation Logic in Domain Entity
```typescript
// GOOD: Business logic in domain layer
class Book {
  calculateOverdueFee(): number {
    const overdueDays = this.getOverdueDays();
    if (overdueDays <= GRACE_PERIOD) return 0;

    const fee = (overdueDays - GRACE_PERIOD) * FEE_PER_DAY;
    return Math.min(fee, MAX_FEE);
  }
}

class BorrowBookService {
  async returnBook(user, book) {
    // ✅ Delegate to entity's domain logic
    const fee = book.calculateOverdueFee();
    const updatedUser = user.returnBook(fee);
  }
}
```

## Edge Cases Handled

### 1. Grace Period Boundary
```typescript
✅ Day 15 (1 day overdue): ¥0
✅ Day 17 (3 days overdue): ¥0
✅ Day 18 (4 days overdue): ¥10
```

### 2. Fee Cap
```typescript
✅ Calculated ¥1,330 → Applied ¥1,000
✅ Calculated ¥2,500 → Applied ¥1,000
```

### 3. Zero Fee Cases
```typescript
✅ Not overdue
✅ Within grace period
✅ Exactly on grace period boundary
```

### 4. State Validation
```typescript
✅ Book not borrowed → Cannot return
✅ Wrong user → Ownership error
✅ Already returned → Status error
```

## Key Takeaways

1. **Business Rules in Domain** - Fee calculation lives in Book entity, not use case
2. **Grace Periods** - First 3 days overdue have no charge
3. **Fee Caps** - Maximum ¥1,000 regardless of overdue duration
4. **Time Calculations** - Centralized in entity methods
5. **Immutability Maintained** - All state changes return new instances
6. **Dedicated Use Cases** - Separate ReturnBookUseCase for clarity
7. **Rich Messages** - Include fee details in success responses
8. **Edge Case Handling** - Boundaries, caps, and zero cases covered

## Comparison with Lesson 3

| Aspect | Lesson 3 (Borrow) | Lesson 4 (Return) |
|--------|-------------------|-------------------|
| Operation | Borrow book | Return book |
| Fee Logic | None | Complex (grace, cap, rate) |
| Business Rules | Eligibility check | Time-based calculation |
| Use Case | BorrowBookUseCase | ReturnBookUseCase ⭐ |
| Domain Service | Coordinate borrow | Coordinate return + fees |
| Entity Logic | Status changes | Fee calculation ⭐ |
| Complexity | Medium | High ⭐ |
| Time Dependency | No | Yes ⭐ |

## Architecture Principles Applied

### 1. Single Responsibility
- **Book**: Calculates its own overdue fees
- **User**: Manages fee accumulation
- **BorrowBookService**: Coordinates return operation
- **ReturnBookUseCase**: Orchestrates application flow

### 2. Domain-Driven Design
- Rich domain model (Book knows fee rules)
- Ubiquitous language (Grace Period, Fee Cap, Overdue)
- Business rules in domain layer
- Entities self-validate

### 3. Encapsulation
- Fee calculation hidden in Book entity
- Constants defined within entity
- Time logic centralized
- State changes immutable

## Next Steps

After mastering Lesson 4, you'll be ready for:
- **Lesson 5**: Reservation System with Queue Management
- **Lesson 6**: Integration Testing and Refactoring

## Resources

- [Domain Logic Patterns](https://martinfowler.com/eaaCatalog/domainModel.html)
- [Time-Based Business Rules](https://enterprisecraftsmanship.com/posts/dealing-with-time-in-domain-model/)
- [Value Calculation Strategies](https://www.domainlanguage.com/ddd/)
- [Testing Time-Dependent Logic](https://stackoverflow.com/questions/2425721/unit-testing-datetime-now)

---

**Expected Score Range**: 95-100
**Pass Criteria**: Score ≥ 60 with no ERROR violations
**Key Focus**: Fee calculation, time-based logic, business rule layering, edge case handling

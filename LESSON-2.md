# Lesson 2: User Entity - Value Objects and Rich Domain Models

## Learning Objectives

- Understand and implement Value Objects
- Build Rich Domain Models with encapsulated business logic
- Learn domain-driven validation patterns
- Master immutable state changes
- Apply complex business rules in entities

## Concepts Covered

### 1. Value Objects
Immutable objects defined by their attributes rather than identity.

### 2. Rich Domain Models
Entities with behavior, not just data containers (avoid anemic domain models).

### 3. Domain-Driven Design (DDD)
Business logic lives in the domain layer, not in use cases or controllers.

### 4. Immutability Patterns
State changes return new instances rather than mutating existing ones.

### 5. Business Rule Enforcement
Domain entities enforce their own invariants and constraints.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── User.ts                     # Rich domain entity
│   ├── valueobjects/
│   │   └── UserId.ts                   # Value object with validation
│   └── repositories/
│       └── IUserRepository.ts          # Repository interface
├── application/
│   └── usecases/
│       └── CreateUserUseCase.ts        # User creation orchestration
├── infrastructure/
│   └── repositories/
│       └── InMemoryUserRepository.ts   # Concrete implementation
├── presentation/
│   └── controllers/
│       └── UserController.ts           # Request handling
└── main.ts                             # Updated composition root
```

## Key Components

### UserId Value Object (`src/domain/valueobjects/UserId.ts`)

**Characteristics:**
- Immutable by design
- Defined by attributes, not identity
- Self-validating
- Can be compared by value

**Features:**
```typescript
✅ 8-digit validation
✅ Static factory method: UserId.create()
✅ Random ID generation: UserId.generate()
✅ Value extraction: getValue()
✅ Equality comparison: equals()
```

**Example:**
```typescript
// Validation
const userId = UserId.create("12345678"); // ✅ Valid
const invalid = UserId.create("123");     // ❌ Throws error

// Generation
const newId = UserId.generate(); // Random 8-digit ID
```

### User Entity (`src/domain/entities/User.ts`)

**Rich Domain Model Features:**

#### Business Constants
```typescript
static readonly MAX_BORROW_LIMIT = 5;
```

#### Status Management
```typescript
enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}
```

#### Business Logic Methods
```typescript
✅ canBorrow(): boolean           // Check borrowing eligibility
✅ borrowBook(): User             // Borrow a book (immutable)
✅ returnBook(): User             // Return a book (immutable)
✅ addOverdueFee(amount): User    // Add overdue charges
✅ payOverdueFee(amount): User    // Pay off fees
✅ suspend(): User                // Suspend account
✅ activate(): User               // Reactivate account
```

#### Validation Rules
- User cannot borrow if suspended
- User cannot borrow if at max limit (5 books)
- User cannot borrow if has overdue fees
- Overdue fees cannot be negative
- Payment cannot exceed current fees

#### Immutability Pattern
```typescript
borrowBook(): User {
  if (!this.canBorrow()) {
    throw new Error('User cannot borrow more books');
  }

  // Return new instance with updated state
  return new User(
    this.id,
    this.name,
    this.email,
    this.status,
    this.currentBorrowCount + 1, // ← State change
    this.overdueFees,
    this.createdAt
  );
}
```

### IUserRepository Interface (`src/domain/repositories/IUserRepository.ts`)

**Extended Contract:**
```typescript
✅ save(user: User): Promise<void>
✅ findById(id: UserId): Promise<User | null>
✅ findByEmail(email: string): Promise<User | null>
✅ findAll(): Promise<User[]>
✅ delete(id: UserId): Promise<void>
✅ findUsersWithOverdueFees(): Promise<User[]>
```

**Domain Query Methods:**
- `findByEmail()`: Business logic queries
- `findUsersWithOverdueFees()`: Domain-specific filtering

### CreateUserUseCase (`src/application/usecases/CreateUserUseCase.ts`)

**Enhanced Validation:**
```typescript
async execute(input: CreateUserInput): Promise<CreateUserOutput> {
  // Business rule: Check duplicate email
  const existingUser = await this.userRepository.findByEmail(input.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create using factory method
  const user = User.create(input.name, input.email);

  // Persist
  await this.userRepository.save(user);

  return { /* ...full user data */ };
}
```

### InMemoryUserRepository (`src/infrastructure/repositories/InMemoryUserRepository.ts`)

**Custom Query Implementations:**
```typescript
async findByEmail(email: string): Promise<User | null> {
  for (const user of this.users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

async findUsersWithOverdueFees(): Promise<User[]> {
  return Array.from(this.users.values())
    .filter(user => user.overdueFees > 0);
}
```

### UserController (`src/presentation/controllers/UserController.ts`)

**Clean Dependency Injection:**
```typescript
export class UserController {
  constructor(private readonly userRepository: IUserRepository) {} // ✅

  async createUser(request: { name: string; email: string }) {
    const useCase = new CreateUserUseCase(this.userRepository);
    // ... handle request
  }
}
```

### Updated Composition Root (`src/main.ts`)

**Expanded Dependency Graph:**
```typescript
// Infrastructure instances
const todoRepository = new InMemoryTodoRepository();
const userRepository = new InMemoryUserRepository();

// Presentation layer with DI
const todoController = new TodoController(todoRepository);
const userController = new UserController(userRepository);

// Export for use
export { todoController, userController };
```

## Value Objects vs Entities

### Value Objects (UserId)
- ✅ Defined by attributes
- ✅ Immutable
- ✅ Compared by value
- ✅ No identity
- Example: UserId, Email, Money, Address

### Entities (User)
- ✅ Defined by identity (id)
- ✅ Can change over time (but immutably)
- ✅ Compared by ID
- ✅ Has lifecycle
- Example: User, Order, Product

## Rich vs Anemic Domain Models

### ❌ Anemic Domain Model (BAD)
```typescript
// Just a data container
class User {
  id: string;
  borrowCount: number;
}

// Business logic in use case
class BorrowBookUseCase {
  execute(userId: string) {
    const user = await this.repo.findById(userId);
    if (user.borrowCount >= 5) {  // ❌ Logic outside domain
      throw new Error('Max limit');
    }
    user.borrowCount++;  // ❌ Direct mutation
  }
}
```

### ✅ Rich Domain Model (GOOD)
```typescript
// Entity with behavior
class User {
  static readonly MAX_BORROW_LIMIT = 5;

  canBorrow(): boolean {
    return this.currentBorrowCount < User.MAX_BORROW_LIMIT;
  }

  borrowBook(): User {
    if (!this.canBorrow()) {
      throw new Error('Cannot borrow');
    }
    return new User(/* ...new state */);
  }
}

// Use case just orchestrates
class BorrowBookUseCase {
  execute(userId: string) {
    const user = await this.repo.findById(userId);
    const updatedUser = user.borrowBook();  // ✅ Domain handles logic
    await this.repo.save(updatedUser);
  }
}
```

## Immutability Benefits

### 1. Thread Safety
No race conditions from concurrent modifications.

### 2. Predictability
State changes are explicit and traceable.

### 3. Debugging
Previous states preserved in call stack.

### 4. Event Sourcing
Natural fit for event-driven systems.

### 5. Testing
Easier to test with predictable state.

## Business Rules Enforcement

### Domain-Level Validation
```typescript
canBorrow(): boolean {
  if (this.status === UserStatus.SUSPENDED) return false;
  if (this.currentBorrowCount >= User.MAX_BORROW_LIMIT) return false;
  if (this.overdueFees > 0) return false;
  return true;
}
```

**Benefits:**
- ✅ Centralized business logic
- ✅ Cannot be bypassed
- ✅ Reusable across use cases
- ✅ Self-documenting

## Clean Architecture Compliance

### Layer Separation
```
Presentation (UserController)
    ↓ depends on
Application (CreateUserUseCase)
    ↓ depends on
Domain (User, UserId, IUserRepository)
    ↑ implemented by
Infrastructure (InMemoryUserRepository)
```

### Dependency Rule
- ✅ Controllers depend on repositories via interfaces
- ✅ Use cases depend on domain interfaces
- ✅ Infrastructure implements domain interfaces
- ✅ Domain has zero dependencies

## Testing Strategy

### Unit Tests

**Value Objects:**
```typescript
test('UserId validates 8 digits', () => {
  expect(() => UserId.create('123')).toThrow();
  expect(UserId.create('12345678')).toBeDefined();
});
```

**Entity Business Logic:**
```typescript
test('User cannot borrow when suspended', () => {
  const user = User.create('John', 'john@example.com')
    .suspend();

  expect(user.canBorrow()).toBe(false);
  expect(() => user.borrowBook()).toThrow();
});
```

**Use Cases:**
```typescript
test('Cannot create duplicate email users', async () => {
  const mockRepo = {
    findByEmail: jest.fn().mockResolvedValue(existingUser),
    save: jest.fn()
  };

  const useCase = new CreateUserUseCase(mockRepo);
  await expect(useCase.execute(input)).rejects.toThrow();
});
```

## Common Pitfalls

### ❌ Mutable State Changes
```typescript
borrowBook(): void {
  this.currentBorrowCount++;  // ❌ Mutation
}
```

### ✅ Immutable State Changes
```typescript
borrowBook(): User {
  return new User(/* ...new state */);  // ✅ New instance
}
```

### ❌ Business Logic in Use Cases
```typescript
// Use case shouldn't contain domain rules
if (user.currentBorrowCount >= 5) {  // ❌ Wrong layer
  throw new Error('Max limit');
}
```

### ✅ Business Logic in Domain
```typescript
// Entity encapsulates rules
if (!user.canBorrow()) {  // ✅ Correct layer
  throw new Error('Cannot borrow');
}
```

## Key Takeaways

1. **Value Objects** represent concepts with no identity (UserId, Email, Money)
2. **Rich Domain Models** contain behavior, not just data
3. **Immutability** provides safety and predictability
4. **Business Rules** belong in the domain layer
5. **Self-Validation** entities validate their own state
6. **Factory Methods** control object creation
7. **Domain Services** handle multi-entity operations

## Comparison with Lesson 1

| Aspect | Lesson 1 (Todo) | Lesson 2 (User) |
|--------|-----------------|-----------------|
| Complexity | Basic entity | Rich domain model |
| Value Objects | None | UserId |
| Business Rules | Simple (title required) | Complex (borrowing logic) |
| State Changes | Direct mutation | Immutable returns |
| Validation | Basic | Multi-rule validation |
| Domain Behavior | Minimal | Extensive |

## Next Steps

After mastering Lesson 2, you'll be ready for:
- **Lesson 3**: Domain Services and Multi-Entity Operations
- **Lesson 4**: Aggregates and Consistency Boundaries
- **Lesson 5**: Domain Events and Event Sourcing
- **Lesson 6**: Integration with External Systems

## Resources

- [Domain-Driven Design by Eric Evans](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [Value Objects Explained](https://martinfowler.com/bliki/ValueObject.html)
- [Anemic Domain Model Anti-Pattern](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [Immutability in DDD](https://enterprisecraftsmanship.com/posts/immutable-architecture/)

---

**Expected Score Range**: 95-100
**Pass Criteria**: Score ≥ 60 with no ERROR violations
**Key Focus**: Value objects, rich domain models, immutability

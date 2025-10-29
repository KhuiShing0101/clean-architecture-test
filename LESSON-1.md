# Lesson 1: Todo Entity - Basic Clean Architecture

## Learning Objectives

- Understand the basic structure of Clean Architecture layers
- Learn how to implement entities with business logic
- Master the Repository Pattern with interface abstraction
- Apply proper Dependency Injection principles
- Create a simple Use Case for business operations

## Concepts Covered

### 1. Domain Layer
The innermost layer containing business logic and entities.

### 2. Repository Pattern
Abstraction for data access that separates domain logic from infrastructure concerns.

### 3. Dependency Injection
Injecting dependencies through constructor parameters rather than direct instantiation.

### 4. Use Cases
Application-specific business rules that orchestrate the flow of data.

## File Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── Todo.ts                    # Domain entity with business rules
│   └── repositories/
│       └── ITodoRepository.ts         # Repository interface
├── application/
│   └── usecases/
│       └── CreateTodoUseCase.ts       # Business logic orchestration
├── infrastructure/
│   └── repositories/
│       └── InMemoryTodoRepository.ts  # Concrete implementation
├── presentation/
│   └── controllers/
│       └── TodoController.ts          # Request handling
└── main.ts                            # Composition root
```

## Key Components

### Todo Entity (`src/domain/entities/Todo.ts`)

**Responsibilities:**
- Encapsulate todo data and behavior
- Validate business rules (e.g., title cannot be empty)
- Self-contained domain logic

**Key Features:**
```typescript
- Factory method: Todo.create()
- Validation in constructor
- Immutability through private constructor
- Business methods: markAsCompleted()
```

### ITodoRepository Interface (`src/domain/repositories/ITodoRepository.ts`)

**Purpose:**
- Define contract for data access
- Keep domain layer independent of infrastructure
- Enable testability through mocking

**Methods:**
```typescript
- save(todo: Todo): Promise<void>
- findById(id: string): Promise<Todo | null>
- findAll(): Promise<Todo[]>
- delete(id: string): Promise<void>
```

### CreateTodoUseCase (`src/application/usecases/CreateTodoUseCase.ts`)

**Responsibilities:**
- Orchestrate todo creation flow
- Apply business validation rules
- Coordinate between domain and repository

**Flow:**
1. Receive input data
2. Create Todo entity using factory method
3. Save via repository interface
4. Return output DTO

### TodoController (`src/presentation/controllers/TodoController.ts`)

**Responsibilities:**
- Handle HTTP-like requests
- Transform external data to use case input
- Format responses

**Dependency Injection:**
```typescript
constructor(private readonly todoRepository: ITodoRepository)
```
✅ Repository injected via constructor
✅ No direct instantiation of infrastructure classes

### Composition Root (`src/main.ts`)

**Purpose:**
- Wire up all dependencies
- Single place for object graph construction
- Resolve dependency chain

**Pattern:**
```typescript
// Instantiate infrastructure
const todoRepository = new InMemoryTodoRepository();

// Inject into presentation layer
const todoController = new TodoController(todoRepository);
```

## Clean Architecture Principles Applied

### 1. Dependency Rule
Dependencies point inward:
- Presentation → Application → Domain
- Infrastructure → Domain (implements interfaces)

### 2. Interface Segregation
- `ITodoRepository` defines minimal contract
- Multiple implementations possible (InMemory, SQL, NoSQL)

### 3. Single Responsibility
Each class has one clear responsibility:
- `Todo`: Domain logic
- `CreateTodoUseCase`: Business flow
- `TodoController`: Request handling
- `InMemoryTodoRepository`: Data storage

### 4. Testability
- Domain logic testable without infrastructure
- Use cases testable with mock repositories
- Controllers testable with mock use cases

## Common Violations to Avoid

### ❌ Direct Instantiation
```typescript
// BAD: Controller creates its own repository
export class TodoController {
  async createTodo(request: any) {
    const repository = new InMemoryTodoRepository(); // ❌ Violation
    const useCase = new CreateTodoUseCase(repository);
  }
}
```

### ✅ Constructor Injection
```typescript
// GOOD: Repository injected via constructor
export class TodoController {
  constructor(private readonly todoRepository: ITodoRepository) {} // ✅ Correct

  async createTodo(request: any) {
    const useCase = new CreateTodoUseCase(this.todoRepository);
  }
}
```

## Testing Strategy

### Unit Tests
- **Todo Entity**: Test validation and business methods
- **CreateTodoUseCase**: Test with mock repository
- **TodoController**: Test with mock use case

### Integration Tests
- Test complete flow with real repository
- Verify data persistence
- Test error handling

## Key Takeaways

1. **Entities** are self-validating and contain business logic
2. **Repositories** abstract data access behind interfaces
3. **Use Cases** orchestrate business operations
4. **Controllers** handle external communication
5. **Composition Root** assembles the dependency graph
6. **Dependency Injection** enables flexibility and testability

## Next Steps

After mastering Lesson 1, you'll be ready for:
- **Lesson 2**: Value Objects and Rich Domain Models
- **Lesson 3**: Domain Services and Complex Business Logic
- **Lesson 4**: Advanced Repository Patterns
- **Lesson 5**: Event-Driven Architecture
- **Lesson 6**: Integration Patterns

## Resources

- [Clean Architecture Book by Robert C. Martin](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)
- [Dependency Injection Principles](https://martinfowler.com/articles/injection.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

---

**Expected Score Range**: 85-100
**Pass Criteria**: Score ≥ 60 with no ERROR violations

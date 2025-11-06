# Clean Architecture Test Project

A simple Todo application demonstrating Clean Architecture principles.

## Project Structure

```
src/
├── domain/              # Business logic layer
│   ├── entities/        # Business entities
│   │   └── Todo.ts
│   └── repositories/    # Repository interfaces
│       └── ITodoRepository.ts
│
├── application/         # Application logic layer
│   └── usecases/        # Use cases
│       └── CreateTodoUseCase.ts
│
├── infrastructure/      # External dependencies layer
│   └── repositories/    # Repository implementations
│       └── InMemoryTodoRepository.ts
│
└── presentation/        # UI/API layer
    └── controllers/     # Controllers
        └── TodoController.ts
```

## Clean Architecture Layers

### 1. Domain Layer
- **Todo Entity**: Contains business logic and validation
- **ITodoRepository**: Defines the contract for data access
- **No dependencies** on other layers

### 2. Application Layer
- **CreateTodoUseCase**: Orchestrates the todo creation process
- Depends only on Domain layer

### 3. Infrastructure Layer
- **InMemoryTodoRepository**: Implements ITodoRepository
- Can depend on Domain and Application layers

### 4. Presentation Layer
- **TodoController**: Handles requests
- Can depend on all layers

## Features

- ✅ Proper layer separation
- ✅ Entity validation
- ✅ Use case pattern
- ✅ Dependency injection via constructors
- ✅ Repository pattern with interfaces
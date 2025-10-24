# Library Clean Architecture Test

This is a test project for learning Clean Architecture principles through a library management system.

## 🏗️ Project Structure

```
src/
├── domain/           # Domain Layer (Business Logic)
│   ├── entity/      # Domain Entities
│   └── repository/  # Repository Interfaces
├── application/     # Application Layer (Use Cases)
│   └── usecase/    # Business Use Cases
└── infrastructure/  # Infrastructure Layer (External Dependencies)
    └── repository/ # Repository Implementations
```

## 📚 Lessons

- **Lesson 1**: Domain Entities - Book
- **Lesson 2**: Domain Entities - User
- **Lesson 3**: Use Cases - Borrow Book

## 🚀 Setup

```bash
npm install
npm run build
```

## ✅ Clean Architecture Principles

1. **Dependency Rule**: Dependencies point inward (Infrastructure → Application → Domain)
2. **Entity Independence**: Domain entities have no external dependencies
3. **Interface Segregation**: Use interfaces for repositories
4. **Separation of Concerns**: Each layer has a clear responsibility

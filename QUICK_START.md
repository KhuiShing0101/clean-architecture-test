# ⚡ Quick Start Guide

## 📁 What's in This Folder?

This is a **complete TypeScript Clean Architecture test project** ready to use for testing your learning app!

### File Structure:
```
test-project/
├── README.md                    # Project overview
├── SETUP_INSTRUCTIONS.md        # Detailed setup guide
├── package.json                 # NPM configuration
├── tsconfig.json                # TypeScript configuration
├── .gitignore                   # Git ignore rules
└── src/
    ├── index.ts                 # Demo entry point
    ├── domain/                  # Domain Layer
    │   ├── entity/
    │   │   ├── Book.ts         # Lesson 1 ✅
    │   │   └── User.ts         # Lesson 2 ✅
    │   └── repository/
    │       ├── IBookRepository.ts
    │       └── IUserRepository.ts
    ├── application/            # Application Layer
    │   └── usecase/
    │       └── BorrowBookUseCase.ts  # Lesson 3 ✅
    └── infrastructure/         # Infrastructure Layer
        └── repository/
            ├── InMemoryBookRepository.ts
            └── InMemoryUserRepository.ts
```

---

## 🚀 5-Minute Setup

### 1. Create GitHub Repository (2 min)
```bash
# In test-project folder:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/library-clean-architecture-test.git
git branch -M main
git push -u origin main
```

### 2. Create 3 Pull Requests (3 min)
```bash
# PR 1 - Lesson 1
git checkout -b lesson-1-book-entity
git add src/domain/entity/Book.ts
git commit -m "Lesson 1: Book Entity"
git push -u origin lesson-1-book-entity

# PR 2 - Lesson 2
git checkout main
git checkout -b lesson-2-user-entity
git add src/domain/entity/User.ts
git commit -m "Lesson 2: User Entity"
git push -u origin lesson-2-user-entity

# PR 3 - Lesson 3
git checkout main
git checkout -b lesson-3-borrow-usecase
git add src/application/usecase/BorrowBookUseCase.ts
git commit -m "Lesson 3: Borrow Use Case"
git push -u origin lesson-3-borrow-usecase
```

### 3. Go to GitHub and create PRs for each branch

**✅ Done!** You now have 3 Pull Requests ready for testing!

---

## 🧪 Test Your App

1. **Login** to your Clean Architecture app
2. **Connect Repository**: `https://github.com/YOUR_USERNAME/library-clean-architecture-test`
3. **Submit PR URLs** in each lesson:
   - Lesson 1 → PR #1 URL
   - Lesson 2 → PR #2 URL
   - Lesson 3 → PR #3 URL

---

## 📚 What Each Lesson Tests

### Lesson 1: Book Entity (Domain Layer)
- **Tests**: Domain entity implementation
- **Clean Architecture**: No external dependencies
- **Features**: Value objects (ISBN), business logic, enums

### Lesson 2: User Entity (Domain Layer)
- **Tests**: Complex domain entity with rules
- **Clean Architecture**: Business rules in domain layer
- **Features**: Value objects (Email), borrowing limits, validation

### Lesson 3: Borrow Book Use Case (Application Layer)
- **Tests**: Use case orchestration
- **Clean Architecture**: Dependency inversion, repository interfaces
- **Features**: Coordinates entities, error handling, business flow

---

## 🎯 What This Tests in Your App

✅ PR submission form
✅ GitHub API integration
✅ PR data storage
✅ PR list display
✅ PR detail view
✅ File diff rendering
✅ Statistics calculation
✅ Mock AI review display

---

## 📖 Need More Details?

See **SETUP_INSTRUCTIONS.md** for complete step-by-step guide with troubleshooting.

---

## 🚧 Next: AI Architecture Checker

After testing, you can implement:
- Real AI code analysis (Anthropic Claude API)
- Architecture violation detection
- Automatic PR review with feedback
- Score calculation based on Clean Architecture principles

---

**Happy Testing! 🎉**

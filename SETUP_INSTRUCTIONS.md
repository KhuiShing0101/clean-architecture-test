# 🚀 Setup Instructions for Test Project

Follow these steps to create the GitHub repository and test Pull Requests.

---

## 📋 Step 1: Create GitHub Repository

1. Go to GitHub: https://github.com/new
2. **Repository name**: `library-clean-architecture-test`
3. **Description**: Test project for Clean Architecture learning
4. **Visibility**: ✅ **Public** (IMPORTANT!)
5. **Initialize**: ❌ Do NOT add README, .gitignore, or license
6. Click **Create repository**

---

## 📦 Step 2: Setup Local Repository

Open terminal in the `test-project` folder and run:

```bash
# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: project setup"

# Add remote (REPLACE with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/library-clean-architecture-test.git

# Create main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## 🔀 Step 3: Create Pull Request for Lesson 1

**Lesson 1: Book Entity**

```bash
# Create branch for lesson 1
git checkout -b lesson-1-book-entity

# The Book.ts file is already there, just commit it
git add src/domain/entity/Book.ts
git commit -m "Lesson 1: Implement Book entity with Clean Architecture

- Created Book domain entity
- Implemented ISBN value object
- Added BookStatus enum
- Included business logic (borrow/return methods)
- No external dependencies (follows dependency rule)"

# Push to GitHub
git push -u origin lesson-1-book-entity
```

**Now go to GitHub and create Pull Request:**
1. Go to your repository on GitHub
2. Click "Compare & pull request" button
3. Title: `Lesson 1: Book Entity Implementation`
4. Base: `main` ← Compare: `lesson-1-book-entity`
5. Add description (optional)
6. Click "Create pull request"

**✅ Copy the PR URL** (e.g., `https://github.com/username/repo/pull/1`)

---

## 🔀 Step 4: Create Pull Request for Lesson 2

**Lesson 2: User Entity**

```bash
# Go back to main
git checkout main

# Create branch for lesson 2
git checkout -b lesson-2-user-entity

# The User.ts file is already there, commit it
git add src/domain/entity/User.ts
git commit -m "Lesson 2: Implement User entity with Clean Architecture

- Created User domain entity
- Implemented Email value object
- Added UserStatus enum
- Implemented business rules (borrow limit, validation)
- Maintains Clean Architecture principles"

# Push to GitHub
git push -u origin lesson-2-user-entity
```

**Create Pull Request on GitHub:**
1. Click "Compare & pull request"
2. Title: `Lesson 2: User Entity Implementation`
3. Base: `main` ← Compare: `lesson-2-user-entity`
4. Click "Create pull request"

**✅ Copy the PR URL** (e.g., `https://github.com/username/repo/pull/2`)

---

## 🔀 Step 5: Create Pull Request for Lesson 3

**Lesson 3: Borrow Book Use Case**

```bash
# Go back to main
git checkout main

# Create branch for lesson 3
git checkout -b lesson-3-borrow-usecase

# The BorrowBookUseCase.ts is already there, commit it
git add src/application/usecase/BorrowBookUseCase.ts
git commit -m "Lesson 3: Implement Borrow Book use case

- Created BorrowBookUseCase in application layer
- Orchestrates domain entities (Book, User)
- Depends on repository interfaces (not implementations)
- Implements complete business flow for borrowing books
- Demonstrates Clean Architecture dependency rule"

# Push to GitHub
git push -u origin lesson-3-borrow-usecase
```

**Create Pull Request on GitHub:**
1. Click "Compare & pull request"
2. Title: `Lesson 3: Borrow Book Use Case`
3. Base: `main` ← Compare: `lesson-3-borrow-usecase`
4. Click "Create pull request"

**✅ Copy the PR URL** (e.g., `https://github.com/username/repo/pull/3`)

---

## ✅ Step 6: Test in Your App

Now you have 3 Pull Requests ready to test!

### In your Clean Architecture Learning App:

1. **Login** to your app
2. **Connect Repository**:
   - Paste: `https://github.com/YOUR_USERNAME/library-clean-architecture-test`
3. **Go to Curriculum** (Lesson 1, 2, 3)
4. **Submit PR URLs**:
   - Lesson 1: Submit PR #1 URL
   - Lesson 2: Submit PR #2 URL
   - Lesson 3: Submit PR #3 URL

### Test These Features:
- ✅ PR submission form validation
- ✅ API stores PR in database
- ✅ PR appears in PR list
- ✅ PR detail view shows files
- ✅ File diffs display correctly
- ✅ Statistics show (files, additions, deletions)

---

## 🎯 PR URLs Format

Your PR URLs should look like:
```
https://github.com/YOUR_USERNAME/library-clean-architecture-test/pull/1
https://github.com/YOUR_USERNAME/library-clean-architecture-test/pull/2
https://github.com/YOUR_USERNAME/library-clean-architecture-test/pull/3
```

---

## 🔧 Troubleshooting

**Problem**: "Repository must be public"
- **Solution**: Go to repository Settings → Change visibility to Public

**Problem**: "PR URL invalid"
- **Solution**: Make sure URL includes `/pull/` and PR number

**Problem**: "Repository not found"
- **Solution**: Check repository URL is correct and accessible

---

## 📝 Notes

- Keep all PRs **open** (don't merge them yet)
- These PRs are for **testing purposes**
- You can create more PRs later for additional lessons
- Repository must remain **public** for GitHub API access

---

## ✨ Next Steps

After testing:
1. Check if all features work correctly
2. Test with different PR states (open, closed, merged)
3. Test error handling (invalid URLs, private repos)
4. Ready to implement AI Architecture Checker!

---

**🎉 You're all set!** Start testing your Clean Architecture learning app!

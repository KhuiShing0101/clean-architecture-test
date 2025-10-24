/**
 * Main Entry Point
 * Demonstrates Clean Architecture in action
 */

import { Book, ISBN, BookStatus } from "./domain/entity/Book";
import { User, Email, UserStatus } from "./domain/entity/User";
import { BorrowBookUseCase } from "./application/usecase/BorrowBookUseCase";
import { InMemoryBookRepository } from "./infrastructure/repository/InMemoryBookRepository";
import { InMemoryUserRepository } from "./infrastructure/repository/InMemoryUserRepository";

async function main() {
  console.log("🏗️ Clean Architecture Demo - Library System\n");

  // Infrastructure Layer - Create repositories
  const bookRepository = new InMemoryBookRepository();
  const userRepository = new InMemoryUserRepository();

  // Domain Layer - Create entities
  const book = new Book(
    "book-1",
    "Clean Architecture",
    new ISBN("978-0134494166"),
    BookStatus.AVAILABLE,
  );

  const user = new User(
    "user-1",
    "John Doe",
    new Email("john@example.com"),
    UserStatus.ACTIVE,
  );

  // Save to repositories
  await bookRepository.save(book);
  await userRepository.save(user);

  console.log("✅ Created book:", book.title);
  console.log("✅ Created user:", user.name);
  console.log();

  // Application Layer - Execute use case
  const borrowBookUseCase = new BorrowBookUseCase(
    bookRepository,
    userRepository,
  );

  console.log("📚 Attempting to borrow book...");
  const result = await borrowBookUseCase.execute({
    userId: user.id,
    bookId: book.id,
  });

  console.log(`${result.success ? "✅" : "❌"} ${result.message}`);
  console.log("Borrowed at:", result.borrowedAt.toISOString());
  console.log();

  // Check final state
  const updatedBook = await bookRepository.findById(book.id);
  const updatedUser = await userRepository.findById(user.id);

  console.log("📖 Book status:", updatedBook?.status);
  console.log("👤 User borrowed books:", updatedUser?.borrowedBooks.length);
}

main().catch(console.error);

/**
 * Main Entry Point / Composition Root
 *
 * This is where we wire up all dependencies.
 * Infrastructure layer components are instantiated here and injected into the application.
 */

import { TodoController } from './presentation/controllers/TodoController';
import { UserController } from './presentation/controllers/UserController';
import { BookController } from './presentation/controllers/BookController';
import { InMemoryTodoRepository } from './infrastructure/repositories/InMemoryTodoRepository';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';
import { InMemoryBookRepository } from './infrastructure/repositories/InMemoryBookRepository';

// Initialize repositories (Infrastructure layer)
const todoRepository = new InMemoryTodoRepository();
const userRepository = new InMemoryUserRepository();
const bookRepository = new InMemoryBookRepository();

// Inject dependencies into controllers (Presentation layer)
const todoController = new TodoController(todoRepository);
const userController = new UserController(userRepository);
const bookController = new BookController(bookRepository, userRepository);

// Example usage
async function main() {
  // Create a user
  const userResult = await userController.createUser({
    name: 'John Doe',
    email: 'john.doe@example.com',
  });
  console.log('User created:', userResult);

  // Create a todo
  const todoResult = await todoController.createTodo({
    title: 'Learn Clean Architecture',
    description: 'Master the principles of Clean Architecture through practice',
  });
  console.log('Todo created:', todoResult);

  // Create a book
  const bookResult = await bookController.createBook({
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '9780134494166',
  });
  console.log('Book created:', bookResult);

  // Borrow a book (demonstrating domain service usage)
  if (userResult.status === 'success' && bookResult.status === 'success') {
    const borrowResult = await bookController.borrowBook({
      userId: userResult.data.id,
      bookId: bookResult.data.id,
    });
    console.log('Borrow result:', borrowResult);
  }
}

// Export for use in other parts of the application
export { todoController, userController, bookController };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

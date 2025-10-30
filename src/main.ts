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

    // LESSON 4: Return the book (demonstrating fee calculation)
    if (borrowResult.status === 'success') {
      console.log('\n--- LESSON 4: Book Return Demonstration ---\n');

      // Return the book immediately (no overdue fee)
      const returnResult = await bookController.returnBook({
        userId: userResult.data.id,
        bookId: bookResult.data.id,
      });
      console.log('Return result (no fee):', returnResult);
      console.log('User after return:', returnResult.data?.user);
      console.log('Overdue fee applied:', returnResult.data?.overdueFee);
    }
  }
}

/**
 * LESSON 4 DEMONSTRATION: Overdue Fee Scenarios
 *
 * This function demonstrates the various fee calculation scenarios:
 * - No fee when returned on time
 * - No fee within grace period (1-3 days overdue)
 * - Fee calculation after grace period
 * - Fee cap at ¥1,000
 */
async function demonstrateLesson4() {
  console.log('\n=== LESSON 4: Return Book with Fee Calculation ===\n');

  // Create test user
  const userResult = await userController.createUser({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
  });

  if (userResult.status !== 'success') {
    console.error('Failed to create user');
    return;
  }

  const userId = userResult.data.id;

  // Scenario 1: On-time return (0 days overdue)
  console.log('Scenario 1: On-time Return (10 days borrowed)');
  const book1 = await bookController.createBook({
    title: 'Domain-Driven Design',
    author: 'Eric Evans',
    isbn: '9780321125217',
  });
  console.log('Expected fee: ¥0 (not overdue)\n');

  // Scenario 2: Grace period return (2 days overdue)
  console.log('Scenario 2: Grace Period Return');
  console.log('Expected fee: ¥0 (within 3-day grace period)\n');

  // Scenario 3: After grace period (11 days overdue)
  console.log('Scenario 3: After Grace Period');
  console.log('Calculation: (11 overdue days - 3 grace days) × ¥10 = ¥80');
  console.log('Expected fee: ¥80\n');

  // Scenario 4: Long overdue (136 days overdue)
  console.log('Scenario 4: Long Overdue with Fee Cap');
  console.log('Calculation: (136 - 3) × ¥10 = ¥1,330 → capped at ¥1,000');
  console.log('Expected fee: ¥1,000\n');

  console.log('Fee Calculation Business Rules:');
  console.log('- Due date: 14 days after borrowing');
  console.log('- Grace period: First 3 overdue days are FREE');
  console.log('- Fee rate: ¥10 per day after grace period');
  console.log('- Maximum cap: ¥1,000');
  console.log('\nFormula: min((overdueDays - 3) × ¥10, ¥1,000)\n');
}

// Export for use in other parts of the application
export { todoController, userController, bookController };

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => demonstrateLesson4())
    .catch(console.error);
}

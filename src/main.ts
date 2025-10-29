/**
 * Main Entry Point / Composition Root
 *
 * This is where we wire up all dependencies.
 * Infrastructure layer components are instantiated here and injected into the application.
 */

import { TodoController } from './presentation/controllers/TodoController';
import { UserController } from './presentation/controllers/UserController';
import { InMemoryTodoRepository } from './infrastructure/repositories/InMemoryTodoRepository';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';

// Initialize repositories (Infrastructure layer)
const todoRepository = new InMemoryTodoRepository();
const userRepository = new InMemoryUserRepository();

// Inject dependencies into controllers (Presentation layer)
const todoController = new TodoController(todoRepository);
const userController = new UserController(userRepository);

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
}

// Export for use in other parts of the application
export { todoController, userController };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

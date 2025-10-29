/**
 * Main Entry Point / Composition Root
 *
 * This is where we wire up all dependencies.
 * Infrastructure layer components are instantiated here and injected into the application.
 */

import { TodoController } from './presentation/controllers/TodoController';
import { InMemoryTodoRepository } from './infrastructure/repositories/InMemoryTodoRepository';

// Initialize dependencies
const todoRepository = new InMemoryTodoRepository();

// Inject dependencies into controllers
const todoController = new TodoController(todoRepository);

// Example usage
async function main() {
  const result = await todoController.createTodo({
    title: 'Learn Clean Architecture',
    description: 'Master the principles of Clean Architecture through practice',
  });

  console.log('Todo created:', result);
}

// Export for use in other parts of the application
export { todoController };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

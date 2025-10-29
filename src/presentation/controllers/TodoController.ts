/**
 * Todo Controller
 * Presentation layer - Handles HTTP requests
 *
 * NOTE: This has an intentional Clean Architecture violation for testing
 */

import { CreateTodoUseCase } from '../../application/usecases/CreateTodoUseCase';
import { InMemoryTodoRepository } from '../../infrastructure/repositories/InMemoryTodoRepository';

export class TodoController {
  async createTodo(request: { title: string; description: string }): Promise<any> {
    // ❌ VIOLATION: Direct instantiation of infrastructure class in presentation layer
    // Should use dependency injection instead
    const repository = new InMemoryTodoRepository();
    const useCase = new CreateTodoUseCase(repository);

    try {
      const result = await useCase.execute({
        title: request.title,
        description: request.description,
      });

      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

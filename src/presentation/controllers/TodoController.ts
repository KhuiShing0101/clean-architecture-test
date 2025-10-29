/**
 * Todo Controller
 * Presentation layer - Handles HTTP requests
 *
 * ✅ Fixed: Now uses dependency injection properly
 */

import { CreateTodoUseCase } from '../../application/usecases/CreateTodoUseCase';
import { ITodoRepository } from '../../domain/repositories/ITodoRepository';

export class TodoController {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async createTodo(request: { title: string; description: string }): Promise<any> {
    // ✅ Use injected repository through interface
    const useCase = new CreateTodoUseCase(this.todoRepository);

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

/**
 * Create Todo Use Case
 * Application layer - Orchestrates business logic
 */

import { Todo } from '../../domain/entities/Todo';
import { ITodoRepository } from '../../domain/repositories/ITodoRepository';

export interface CreateTodoInput {
  title: string;
  description: string;
}

export interface CreateTodoOutput {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

export class CreateTodoUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: CreateTodoInput): Promise<CreateTodoOutput> {
    // Generate ID (in real app, this might come from a service)
    const id = this.generateId();

    // Create todo entity using factory method
    const todo = Todo.create(id, input.title, input.description);

    // Save to repository
    await this.todoRepository.save(todo);

    // Return output
    return {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      createdAt: todo.createdAt,
    };
  }

  private generateId(): string {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

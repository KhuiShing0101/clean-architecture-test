/**
 * In-Memory Todo Repository Implementation
 * Infrastructure layer - Implements data persistence
 */

import { Todo } from '../../domain/entities/Todo';
import { ITodoRepository } from '../../domain/repositories/ITodoRepository';

export class InMemoryTodoRepository implements ITodoRepository {
  private todos: Map<string, Todo> = new Map();

  async save(todo: Todo): Promise<void> {
    this.todos.set(todo.id, todo);
  }

  async findById(id: string): Promise<Todo | null> {
    return this.todos.get(id) || null;
  }

  async findAll(): Promise<Todo[]> {
    return Array.from(this.todos.values());
  }

  async delete(id: string): Promise<void> {
    this.todos.delete(id);
  }
}

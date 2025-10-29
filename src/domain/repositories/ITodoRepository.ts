/**
 * Todo Repository Interface
 * Domain layer - Defines the contract for data access
 */

import { Todo } from '../entities/Todo';

export interface ITodoRepository {
  /**
   * Save a todo
   */
  save(todo: Todo): Promise<void>;

  /**
   * Find a todo by ID
   */
  findById(id: string): Promise<Todo | null>;

  /**
   * Find all todos
   */
  findAll(): Promise<Todo[]>;

  /**
   * Delete a todo
   */
  delete(id: string): Promise<void>;
}

/**
 * Todo Entity
 * Domain layer - Contains business logic and validation
 */

export class Todo {
  private constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly completed: boolean,
    public readonly createdAt: Date
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new Todo
   */
  static create(
    id: string,
    title: string,
    description: string
  ): Todo {
    return new Todo(id, title, description, false, new Date());
  }

  /**
   * Mark todo as completed
   */
  complete(): Todo {
    if (this.completed) {
      throw new Error('Todo is already completed');
    }
    return new Todo(
      this.id,
      this.title,
      this.description,
      true,
      this.createdAt
    );
  }

  /**
   * Validate entity state
   */
  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Todo title cannot be empty');
    }

    if (this.title.length > 200) {
      throw new Error('Todo title cannot exceed 200 characters');
    }

    if (this.description && this.description.length > 1000) {
      throw new Error('Todo description cannot exceed 1000 characters');
    }
  }
}

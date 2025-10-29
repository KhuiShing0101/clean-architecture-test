/**
 * Book ID Value Object
 * Represents a unique book identifier (ISBN-like format)
 */

export class BookId {
  private constructor(private readonly value: string) {
    this.validate();
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Book ID cannot be empty');
    }
    if (!/^[A-Z0-9]{10}$/.test(this.value)) {
      throw new Error('Book ID must be 10 alphanumeric characters');
    }
  }

  /**
   * Create a BookId from a string
   */
  static create(id: string): BookId {
    return new BookId(id.toUpperCase());
  }

  /**
   * Generate a random BookId
   */
  static generate(): BookId {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return new BookId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BookId): boolean {
    return this.value === other.value;
  }
}

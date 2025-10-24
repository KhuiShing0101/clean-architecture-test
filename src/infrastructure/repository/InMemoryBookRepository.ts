/**
 * In-Memory Book Repository - Infrastructure Layer
 *
 * Clean Architecture principle:
 * - Infrastructure implements domain interfaces
 * - Can be easily swapped with database implementation
 * - Domain layer doesn't know about this implementation
 */

import { Book, BookStatus } from "../../domain/entity/Book";
import { IBookRepository } from "../../domain/repository/IBookRepository";

export class InMemoryBookRepository implements IBookRepository {
  private books: Map<string, Book> = new Map();

  async findById(id: string): Promise<Book | null> {
    return this.books.get(id) || null;
  }

  async findAvailable(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) => book.status === BookStatus.AVAILABLE,
    );
  }

  async save(book: Book): Promise<void> {
    this.books.set(book.id, book);
  }

  async delete(id: string): Promise<void> {
    this.books.delete(id);
  }

  // Helper method for testing
  clear(): void {
    this.books.clear();
  }
}

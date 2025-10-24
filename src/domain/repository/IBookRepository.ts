/**
 * Book Repository Interface - Domain Layer
 *
 * Clean Architecture principle:
 * - Domain defines interfaces
 * - Infrastructure implements them
 * - Dependency Inversion Principle
 */

import { Book } from "../entity/Book";

export interface IBookRepository {
  /**
   * Find a book by its ID
   */
  findById(id: string): Promise<Book | null>;

  /**
   * Find all available books
   */
  findAvailable(): Promise<Book[]>;

  /**
   * Save a book (create or update)
   */
  save(book: Book): Promise<void>;

  /**
   * Delete a book
   */
  delete(id: string): Promise<void>;
}

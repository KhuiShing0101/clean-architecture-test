/**
 * Book Repository Interface
 * Domain layer - Defines the contract for book data access
 */

import { Book } from '../entities/Book';
import { BookId } from '../valueobjects/BookId';
import { UserId } from '../valueobjects/UserId';

export interface IBookRepository {
  /**
   * Save a book
   */
  save(book: Book): Promise<void>;

  /**
   * Find a book by ID
   */
  findById(id: BookId): Promise<Book | null>;

  /**
   * Find a book by ISBN
   */
  findByIsbn(isbn: string): Promise<Book | null>;

  /**
   * Find all books
   */
  findAll(): Promise<Book[]>;

  /**
   * Find available books
   */
  findAvailableBooks(): Promise<Book[]>;

  /**
   * Find books borrowed by a specific user
   */
  findBooksBorrowedByUser(userId: UserId): Promise<Book[]>;

  /**
   * Find overdue books
   */
  findOverdueBooks(): Promise<Book[]>;

  /**
   * Delete a book
   */
  delete(id: BookId): Promise<void>;
}

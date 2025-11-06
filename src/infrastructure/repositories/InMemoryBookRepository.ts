/**
 * In-Memory Book Repository Implementation
 * Infrastructure layer - Implements book data persistence
 */

import { Book, BookStatus } from '../../domain/entities/Book';
import { BookId } from '../../domain/valueobjects/BookId';
import { UserId } from '../../domain/valueobjects/UserId';
import { IBookRepository } from '../../domain/repositories/IBookRepository';

export class InMemoryBookRepository implements IBookRepository {
  private books: Map<string, Book> = new Map();

  async save(book: Book): Promise<void> {
    this.books.set(book.id.getValue(), book);
  }

  async findById(id: BookId): Promise<Book | null> {
    return this.books.get(id.getValue()) || null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    for (const book of this.books.values()) {
      if (book.isbn === isbn) {
        return book;
      }
    }
    return null;
  }

  async findAll(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async findAvailableBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) => book.status === BookStatus.AVAILABLE
    );
  }

  async findBooksBorrowedByUser(userId: UserId): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) =>
        book.status === BookStatus.BORROWED &&
        book.borrowedBy &&
        book.borrowedBy.equals(userId)
    );
  }

  async findOverdueBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) => book.status === BookStatus.BORROWED && book.isOverdue()
    );
  }

  async delete(id: BookId): Promise<void> {
    this.books.delete(id.getValue());
  }
}

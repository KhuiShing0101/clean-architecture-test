/**
 * Create Book Use Case
 * Application layer - Orchestrates book creation business logic
 */

import { Book } from '../../domain/entities/Book';
import { IBookRepository } from '../../domain/repositories/IBookRepository';

export interface CreateBookInput {
  title: string;
  author: string;
  isbn: string;
}

export interface CreateBookOutput {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: string;
  createdAt: Date;
}

export class CreateBookUseCase {
  constructor(private readonly bookRepository: IBookRepository) {}

  async execute(input: CreateBookInput): Promise<CreateBookOutput> {
    // Check if book with same ISBN already exists
    const existingBook = await this.bookRepository.findByIsbn(input.isbn);
    if (existingBook) {
      throw new Error('Book with this ISBN already exists');
    }

    // Create book entity using factory method
    const book = Book.create(input.title, input.author, input.isbn);

    // Save to repository
    await this.bookRepository.save(book);

    // Return output
    return {
      id: book.id.getValue(),
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      status: book.status,
      createdAt: book.createdAt,
    };
  }
}

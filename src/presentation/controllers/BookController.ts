/**
 * Book Controller
 * Presentation layer - Handles HTTP requests for book operations
 *
 * ✅ Uses proper dependency injection
 */

import { CreateBookUseCase } from '../../application/usecases/CreateBookUseCase';
import { BorrowBookUseCase } from '../../application/usecases/BorrowBookUseCase';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class BookController {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async createBook(request: {
    title: string;
    author: string;
    isbn: string;
  }): Promise<any> {
    // ✅ Use injected repository through interface
    const useCase = new CreateBookUseCase(this.bookRepository);

    try {
      const result = await useCase.execute({
        title: request.title,
        author: request.author,
        isbn: request.isbn,
      });

      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async borrowBook(request: { userId: string; bookId: string }): Promise<any> {
    // ✅ Use injected repositories through interfaces
    const useCase = new BorrowBookUseCase(
      this.userRepository,
      this.bookRepository
    );

    try {
      const result = await useCase.execute({
        userId: request.userId,
        bookId: request.bookId,
      });

      return {
        status: result.success ? 'success' : 'error',
        message: result.message,
        data: result.success
          ? {
              user: result.user,
              book: result.book,
            }
          : undefined,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

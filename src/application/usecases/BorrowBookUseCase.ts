/**
 * Borrow Book Use Case
 * Application layer - Orchestrates the book borrowing flow
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { BorrowBookService } from '../../domain/services/BorrowBookService';
import { UserId } from '../../domain/valueobjects/UserId';
import { BookId } from '../../domain/valueobjects/BookId';

export interface BorrowBookInput {
  userId: string;
  bookId: string;
}

export interface BorrowBookOutput {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    currentBorrowCount: number;
  };
  book?: {
    id: string;
    title: string;
    author: string;
    status: string;
  };
}

export class BorrowBookUseCase {
  private borrowService: BorrowBookService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {
    // Initialize domain service with repositories
    this.borrowService = new BorrowBookService(userRepository, bookRepository);
  }

  async execute(input: BorrowBookInput): Promise<BorrowBookOutput> {
    // Find user
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Find book
    const bookId = BookId.create(input.bookId);
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      return {
        success: false,
        message: 'Book not found',
      };
    }

    // Execute domain service
    const result = await this.borrowService.execute(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to borrow book',
      };
    }

    // Return success response
    return {
      success: true,
      message: 'Book borrowed successfully',
      user: {
        id: result.updatedUser!.id.getValue(),
        name: result.updatedUser!.name,
        currentBorrowCount: result.updatedUser!.currentBorrowCount,
      },
      book: {
        id: result.updatedBook!.id.getValue(),
        title: result.updatedBook!.title,
        author: result.updatedBook!.author,
        status: result.updatedBook!.status,
      },
    };
  }
}

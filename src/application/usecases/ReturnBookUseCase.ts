/**
 * Return Book Use Case
 * Application layer - Orchestrates the book return flow with fee calculation
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { BorrowBookService } from '../../domain/services/BorrowBookService';
import { UserId } from '../../domain/valueobjects/UserId';
import { BookId } from '../../domain/valueobjects/BookId';
import { BookStatus } from '../../domain/entities/Book';
import { IEventBus } from '../../domain/events/IEventBus';

export interface ReturnBookInput {
  userId: string;
  bookId: string;
}

export interface ReturnBookOutput {
  success: boolean;
  message: string;
  overdueFee?: number;
  user?: {
    id: string;
    name: string;
    currentBorrowCount: number;
    overdueFees: number;
  };
  book?: {
    id: string;
    title: string;
    status: string;
  };
}

export class ReturnBookUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly borrowService: BorrowBookService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: ReturnBookInput): Promise<ReturnBookOutput> {
    // Find user by ID
    const userId = UserId.create(input.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Find book by ID
    const bookId = BookId.create(input.bookId);
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      return {
        success: false,
        message: 'Book not found',
      };
    }

    // Validate book is borrowed
    if (book.status !== BookStatus.BORROWED) {
      return {
        success: false,
        message: 'Book is not currently borrowed',
      };
    }

    // Execute domain service
    const result = await this.borrowService.returnBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to return book',
      };
    }

    // Publish domain events raised by the book entity
    const returnedBook = result.updatedBook!;
    const domainEvents = returnedBook.getDomainEvents();

    for (const event of domainEvents) {
      await this.eventBus.publish(event);
    }

    // Clear events after publishing
    returnedBook.clearDomainEvents();

    // Build success response with fee information
    const feeMessage =
      result.overdueFee && result.overdueFee > 0
        ? ` Overdue fee applied: ¥${result.overdueFee}`
        : '';

    return {
      success: true,
      message: `Book returned successfully.${feeMessage}`,
      overdueFee: result.overdueFee || 0,
      user: result.updatedUser
        ? {
            id: result.updatedUser.id.getValue(),
            name: result.updatedUser.name,
            currentBorrowCount: result.updatedUser.currentBorrowCount,
            overdueFees: result.updatedUser.overdueFees,
          }
        : undefined,
      book: result.updatedBook
        ? {
            id: result.updatedBook.id.getValue(),
            title: result.updatedBook.title,
            status: result.updatedBook.status,
          }
        : undefined,
    };
  }
}

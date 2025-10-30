/**
 * Borrow Book Domain Service
 * Domain layer - Coordinates borrowing operation between User and Book entities
 *
 * Domain Services are used when:
 * 1. An operation involves multiple entities
 * 2. The operation doesn't naturally belong to one entity
 * 3. Business logic requires coordination between aggregates
 */

import { User } from '../entities/User';
import { Book } from '../entities/Book';
import { IUserRepository } from '../repositories/IUserRepository';
import { IBookRepository } from '../repositories/IBookRepository';

export interface BorrowBookResult {
  success: boolean;
  updatedUser?: User;
  updatedBook?: Book;
  overdueFee?: number;
  error?: string;
}

export class BorrowBookService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository
  ) {}

  /**
   * Domain service to handle book borrowing
   * Coordinates state changes across User and Book entities
   */
  async execute(user: User, book: Book): Promise<BorrowBookResult> {
    // Validate user eligibility
    if (!user.canBorrow()) {
      return {
        success: false,
        error: 'User is not eligible to borrow books',
      };
    }

    // Validate book availability
    if (!book.isAvailable()) {
      return {
        success: false,
        error: 'Book is not available for borrowing',
      };
    }

    try {
      // Update user state (immutable)
      const updatedUser = user.borrowBook();

      // Update book state (immutable)
      const updatedBook = book.borrow(user.id);

      // Persist changes to both aggregates
      await this.userRepository.save(updatedUser);
      await this.bookRepository.save(updatedBook);

      return {
        success: true,
        updatedUser,
        updatedBook,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Domain service to handle book return
   * Coordinates state changes across User and Book entities
   * Applies overdue fees based on business rules
   */
  async returnBook(user: User, book: Book): Promise<BorrowBookResult> {
    // Validate book is borrowed by this user
    if (!book.borrowedBy || !book.borrowedBy.equals(user.id)) {
      return {
        success: false,
        error: 'Book is not borrowed by this user',
      };
    }

    try {
      // Calculate overdue fee using Book's domain logic
      const overdueFee = book.calculateOverdueFee();

      // Update user state with calculated fee (immutable)
      const updatedUser = user.returnBook(overdueFee);

      // Update book state (immutable)
      const updatedBook = book.returnBook();

      // Persist changes to both aggregates
      await this.userRepository.save(updatedUser);
      await this.bookRepository.save(updatedBook);

      return {
        success: true,
        updatedUser,
        updatedBook,
        overdueFee, // Return fee for presentation layer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Borrow Book Use Case - Lesson 3
 *
 * Application Layer - Use Cases
 * Orchestrates business logic between entities
 *
 * Clean Architecture principles:
 * - Use case coordinates domain entities
 * - Depends on repository interfaces (not implementations)
 * - Contains application-specific business rules
 */

import { IBookRepository } from "../../domain/repository/IBookRepository";
import { IUserRepository } from "../../domain/repository/IUserRepository";

export interface BorrowBookInput {
  userId: string;
  bookId: string;
}

export interface BorrowBookOutput {
  success: boolean;
  message: string;
  borrowedAt: Date;
}

export class BorrowBookUseCase {
  constructor(
    private readonly bookRepository: IBookRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Execute the borrow book use case
   *
   * Business flow:
   * 1. Validate user exists and can borrow
   * 2. Validate book exists and is available
   * 3. Borrow the book (update book status)
   * 4. Update user's borrowed books list
   * 5. Save changes
   */
  async execute(input: BorrowBookInput): Promise<BorrowBookOutput> {
    const { userId, bookId } = input;

    // 1. Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return {
        success: false,
        message: `User with ID ${userId} not found`,
        borrowedAt: new Date(),
      };
    }

    // 2. Check if user can borrow
    if (!user.canBorrow()) {
      return {
        success: false,
        message: `User ${user.name} cannot borrow more books`,
        borrowedAt: new Date(),
      };
    }

    // 3. Get book
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      return {
        success: false,
        message: `Book with ID ${bookId} not found`,
        borrowedAt: new Date(),
      };
    }

    // 4. Try to borrow the book (domain logic)
    try {
      book.borrow();
      user.addBorrowedBook(bookId);
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to borrow book",
        borrowedAt: new Date(),
      };
    }

    // 5. Save changes
    await this.bookRepository.save(book);
    await this.userRepository.save(user);

    // 6. Return success
    const borrowedAt = new Date();
    return {
      success: true,
      message: `Successfully borrowed "${book.title}"`,
      borrowedAt,
    };
  }
}

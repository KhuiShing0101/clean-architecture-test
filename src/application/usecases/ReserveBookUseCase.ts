/**
 * ReserveBookUseCase
 * Application layer - Orchestrates book reservation flow
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { IReservationRepository } from '../../domain/repositories/IReservationRepository';
import { ReservationQueueService } from '../../domain/services/ReservationQueueService';
import { UserId } from '../../domain/valueobjects/UserId';
import { BookId } from '../../domain/valueobjects/BookId';

export interface ReserveBookInput {
  userId: string;
  bookId: string;
}

export interface ReserveBookOutput {
  success: boolean;
  message: string;
  reservation?: {
    id: string;
    status: string;
    queuePosition: number;
    createdAt: Date;
  };
}

export class ReserveBookUseCase {
  private queueService: ReservationQueueService;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly reservationRepository: IReservationRepository
  ) {
    this.queueService = new ReservationQueueService(reservationRepository);
  }

  async execute(input: ReserveBookInput): Promise<ReserveBookOutput> {
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

    // Check if book is available
    if (book.isAvailable()) {
      return {
        success: false,
        message: 'Book is currently available. Please borrow it directly instead of reserving.',
      };
    }

    // Reserve book through queue service
    const result = await this.queueService.reserveBook(user, book);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to reserve book',
      };
    }

    // Get queue position
    const queuePosition = await this.queueService.getQueuePosition(
      book.id,
      user.id.getValue()
    );

    return {
      success: true,
      message: `Book reserved successfully. You are #${queuePosition} in the queue.`,
      reservation: {
        id: result.reservation!.id.getValue(),
        status: result.reservation!.status,
        queuePosition,
        createdAt: result.reservation!.createdAt,
      },
    };
  }
}

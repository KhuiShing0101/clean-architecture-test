/**
 * ReservationController
 * Presentation layer - Handles HTTP requests for reservation operations
 */

import { ReserveBookUseCase } from '../../application/usecases/ReserveBookUseCase';
import { CancelReservationUseCase } from '../../application/usecases/CancelReservationUseCase';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IBookRepository } from '../../domain/repositories/IBookRepository';
import { IReservationRepository } from '../../domain/repositories/IReservationRepository';

export class ReservationController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookRepository: IBookRepository,
    private readonly reservationRepository: IReservationRepository
  ) {}

  /**
   * Reserve a book
   */
  async reserveBook(request: {
    userId: string;
    bookId: string;
  }): Promise<any> {
    const useCase = new ReserveBookUseCase(
      this.userRepository,
      this.bookRepository,
      this.reservationRepository
    );

    try {
      const result = await useCase.execute({
        userId: request.userId,
        bookId: request.bookId,
      });

      return {
        status: result.success ? 'success' : 'error',
        message: result.message,
        data: result.reservation || null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(request: {
    reservationId: string;
  }): Promise<any> {
    const useCase = new CancelReservationUseCase(this.reservationRepository);

    try {
      const result = await useCase.execute({
        reservationId: request.reservationId,
      });

      return {
        status: result.success ? 'success' : 'error',
        message: result.message,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(request: { userId: string }): Promise<any> {
    try {
      const userId = require('../../domain/valueobjects/UserId').UserId.create(request.userId);
      const reservations = await this.reservationRepository.findByUser(userId);

      return {
        status: 'success',
        data: reservations.map((r) => ({
          id: r.id.getValue(),
          bookId: r.bookId.getValue(),
          status: r.status,
          createdAt: r.createdAt,
          readyAt: r.readyAt,
          expiresAt: r.expiresAt,
          remainingDays: r.getRemainingDays(),
        })),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

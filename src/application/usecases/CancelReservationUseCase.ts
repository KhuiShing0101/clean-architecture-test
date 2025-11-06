/**
 * CancelReservationUseCase
 * Application layer - Handles reservation cancellation
 */

import { IReservationRepository } from '../../domain/repositories/IReservationRepository';
import { ReservationQueueService } from '../../domain/services/ReservationQueueService';
import { ReservationId } from '../../domain/valueobjects/ReservationId';
import { ReservationStatus } from '../../domain/entities/Reservation';

export interface CancelReservationInput {
  reservationId: string;
}

export interface CancelReservationOutput {
  success: boolean;
  message: string;
}

export class CancelReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly queueService: ReservationQueueService
  ) {}

  async execute(input: CancelReservationInput): Promise<CancelReservationOutput> {
    // Find reservation
    const reservationId = ReservationId.create(input.reservationId);
    const reservation = await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      return {
        success: false,
        message: 'Reservation not found',
      };
    }

    // Check if cancellable
    if (reservation.status === ReservationStatus.FULFILLED) {
      return {
        success: false,
        message: 'Cannot cancel fulfilled reservation',
      };
    }

    if (reservation.status === ReservationStatus.EXPIRED) {
      return {
        success: false,
        message: 'Cannot cancel expired reservation',
      };
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return {
        success: false,
        message: 'Reservation is already cancelled',
      };
    }

    // Cancel reservation
    await this.queueService.cancelReservation(reservation);

    return {
      success: true,
      message: 'Reservation cancelled successfully',
    };
  }
}

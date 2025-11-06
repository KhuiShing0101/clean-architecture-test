/**
 * ReservationId Value Object
 * Domain layer - Represents a reservation identifier
 *
 * Format: RES + 10 digits (e.g., "RES0001234567")
 */

export class ReservationId {
  private constructor(private readonly value: string) {
    this.validate();
  }

  private validate(): void {
    if (!this.value || !/^RES\d{10}$/.test(this.value)) {
      throw new Error('ReservationId must be in format RES + 10 digits (e.g., RES0001234567)');
    }
  }

  /**
   * Create ReservationId from string
   */
  static create(id: string): ReservationId {
    return new ReservationId(id);
  }

  /**
   * Generate new ReservationId
   */
  static generate(): ReservationId {
    const timestamp = Date.now().toString().slice(-10);
    const id = `RES${timestamp.padStart(10, '0')}`;
    return new ReservationId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ReservationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

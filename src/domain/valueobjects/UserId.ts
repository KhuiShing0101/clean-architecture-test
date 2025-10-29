/**
 * UserId Value Object
 * Domain layer - Represents an 8-digit user ID
 */

export class UserId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Create a UserId from an 8-digit string
   */
  static create(id: string): UserId {
    // Validate: must be exactly 8 digits
    if (!/^\d{8}$/.test(id)) {
      throw new Error('User ID must be exactly 8 digits');
    }

    return new UserId(id);
  }

  /**
   * Generate a random 8-digit user ID
   */
  static generate(): UserId {
    const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    return new UserId(randomId);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

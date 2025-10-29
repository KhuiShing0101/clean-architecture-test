/**
 * Create User Use Case
 * Application layer - Orchestrates user creation business logic
 */

import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface CreateUserOutput {
  id: string;
  name: string;
  email: string;
  status: string;
  currentBorrowCount: number;
  overdueFees: number;
  createdAt: Date;
}

export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user entity using factory method
    const user = User.create(input.name, input.email);

    // Save to repository
    await this.userRepository.save(user);

    // Return output
    return {
      id: user.id.getValue(),
      name: user.name,
      email: user.email,
      status: user.status,
      currentBorrowCount: user.currentBorrowCount,
      overdueFees: user.overdueFees,
      createdAt: user.createdAt,
    };
  }
}

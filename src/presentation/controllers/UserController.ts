/**
 * User Controller
 * Presentation layer - Handles HTTP requests for user operations
 *
 * ✅ Uses proper dependency injection
 */

import { CreateUserUseCase } from '../../application/usecases/CreateUserUseCase';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class UserController {
  constructor(private readonly userRepository: IUserRepository) {}

  async createUser(request: { name: string; email: string }): Promise<any> {
    // ✅ Use injected repository through interface
    const useCase = new CreateUserUseCase(this.userRepository);

    try {
      const result = await useCase.execute({
        name: request.name,
        email: request.email,
      });

      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

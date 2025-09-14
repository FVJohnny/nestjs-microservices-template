import type { JwtService } from '@nestjs/jwt';
import type { User } from '@bc/auth/domain/entities/user/user.entity';

/**
 * Simple utility class for creating JWT tokens in E2E tests
 */
export class AuthTestHelper {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Creates JWT token for a given user
   */
  createAuthToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    };
    return this.jwtService.sign(payload);
  }
}

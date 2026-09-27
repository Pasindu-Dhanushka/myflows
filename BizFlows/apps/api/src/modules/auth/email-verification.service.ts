import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class EmailVerificationService {
  generateToken() {
    const token = randomBytes(32).toString('hex');

    return {
      token,
      tokenHash: this.hashToken(token),
    };
  }

  hashToken(token: string) {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
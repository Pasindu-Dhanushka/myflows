import type { Request } from 'express';

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
};

export type AuthenticatedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
};

export interface AuthenticatedRequest extends Request {
  auth: {
    sessionId: string;
    user: AuthenticatedUser;
  };
}

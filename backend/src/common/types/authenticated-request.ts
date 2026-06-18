import { Request } from 'express';

export interface AuthPrincipal {
  userId: string;
  email: string;
  role: 'player' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user: AuthPrincipal;
  requestId: string;
}

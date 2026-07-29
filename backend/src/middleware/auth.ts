// src/middleware/auth.ts
// JWT authentication middleware and role-based access control

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    branch_id?: string;
    email: string;
    name: string;
  };
}

/**
 * Middleware to verify JWT token from Authorization header or cookie.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET not configured');

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      role: UserRole;
      branch_id?: string;
      email: string;
      name: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Middleware factory to restrict access to specific roles.
 * @param roles - Allowed roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Generate a JWT token for a user.
 */
export function generateToken(payload: {
  id: string;
  role: UserRole;
  branch_id?: string;
  email: string;
  name: string;
}): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not configured');

  return jwt.sign(payload, jwtSecret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as string) || '7d',
  });
}

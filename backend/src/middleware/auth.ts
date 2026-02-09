import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token verification failed' });
  }
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err.message === 'INVALID_TOKEN') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
};

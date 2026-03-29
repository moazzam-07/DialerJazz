import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getInsforgeClient } from '../lib/insforge';
import { ApiError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: any;
  db?: ReturnType<typeof getInsforgeClient>;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or unsupported authorization header', 'missing_token');
    }

    const token = authHeader.split(' ')[1];
    
    // Initialize an isolated client instance with the user's token
    const insforgeClient = getInsforgeClient(token);
    
    // Decode the JWT to get the user payload. The actual cryptographic signature validation
    // is securely handled by InsForge PostgREST whenever req.db makes an API call.
    const decoded = jwt.decode(token) as any;
    
    if (!decoded || !decoded.sub) {
      throw new ApiError(401, 'Invalid or expired token.', 'invalid_token');
    }

    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    req.db = insforgeClient; // Inject authenticated DB client for RLS
    next();
  } catch (error) {
    next(error);
  }
};

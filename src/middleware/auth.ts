import { Request, Response, NextFunction } from 'express';
import supabaseAnon from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data, error } = await supabaseAnon.auth.getUser(token);
    
    if (error || !data.user) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
      return;
    }
    
    // Attach the user to the request
    (req as AuthenticatedRequest).user = data.user;
    
    next();
  } catch (error) {
    next(error);
  }
}; 
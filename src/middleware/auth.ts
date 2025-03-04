import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
    }
    
    // Attach the user to the request
    req.user = data.user;
    
    next();
  } catch (error) {
    next(error);
  }
}; 
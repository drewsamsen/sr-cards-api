import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add CORS headers directly to responses
 * This can be used as a fallback for specific routes if needed
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', '*');
  
  // Allow specific HTTP methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  
  // Allow specific headers
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Method, Access-Control-Request-Headers'
  );
  
  // Allow credentials
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Cache preflight response for 24 hours (in seconds)
    res.header('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  next();
}; 
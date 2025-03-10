import { CorsOptions } from 'cors';

/**
 * CORS configuration for the API
 * This can be adjusted based on environment variables
 */
const corsOptions: CorsOptions = {
  // For production, you might want to specify allowed origins
  // origin: process.env.NODE_ENV === 'production' 
  //   ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'] 
  //   : '*',
  
  // For now, allow all origins since this API needs to accept requests from various sources
  origin: '*',
  
  // Allow all common HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allow a broad range of headers
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Access-Control-Request-Method', 
    'Access-Control-Request-Headers'
  ],
  
  // Headers that can be exposed to the client
  exposedHeaders: [
    'Content-Length', 
    'Content-Type', 
    'Authorization'
  ],
  
  // Allow credentials (cookies, authorization headers, or TLS client certificates)
  credentials: true,
  
  // Cache preflight requests for 24 hours (in seconds)
  maxAge: 86400
};

export default corsOptions; 
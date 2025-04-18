import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Load environment-specific variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

// Load environment files
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Create Express app
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Simple CORS configuration - this is a fallback for local development
// In production, the CORS headers are set by Vercel through vercel.json
app.use(cors());

// Add a delay to all requests in development environment to simulate production latency
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    setTimeout(next, 500); // 500ms delay for all requests
  });
}

// Increase JSON body parser limit to 10MB for large CSV data
app.use(express.json({ limit: '10mb' }));
// Increase URL-encoded body parser limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route handler - simple JSON response
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Card API is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes
app.use('/api', router);

// Error handling middleware
app.use(errorHandler);

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port} and accessible from other devices on the network`);
  });
}

// Export the Express app for serverless environments
export default app;
// Add CommonJS export for compatibility
module.exports = app;

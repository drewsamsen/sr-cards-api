import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';

// Load environment-specific variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Create Express app
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

// Middleware
app.use(cors({
  origin: '*', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Increase JSON body parser limit to 10MB for large CSV data
app.use(express.json({ limit: '10mb' }));
// Increase URL-encoded body parser limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
module.exports = app; 
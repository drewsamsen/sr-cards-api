import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Increase JSON body parser limit to 10MB for large CSV data
app.use(express.json({ limit: '10mb' }));
// Increase URL-encoded body parser limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', router);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 
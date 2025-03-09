// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// Import the compiled Express app
const app = require('../dist/index.js');

// Add a root route handler if not already present
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Card API is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Export the Express app for Vercel
module.exports = app; 
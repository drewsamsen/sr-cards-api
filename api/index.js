// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// Import the compiled Express app
// Note: The dist directory should be created during the build phase by Vercel
try {
  const app = require('../dist/index.js');
  module.exports = app;
} catch (error) {
  // Fallback response if the compiled app can't be loaded
  console.error('Failed to load compiled app:', error);
  
  // Create a minimal Express app as fallback
  const express = require('express');
  const app = express();
  
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Server initialization failed',
      message: 'The application failed to start properly. Please check server logs.',
      timestamp: new Date().toISOString()
    });
  });
  
  module.exports = app;
} 
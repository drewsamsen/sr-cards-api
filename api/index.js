// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// First, ensure the TypeScript is compiled
const { execSync } = require('child_process');
try {
  // Only run build in production to avoid unnecessary builds during development
  if (process.env.NODE_ENV === 'production') {
    console.log('Building TypeScript...');
    execSync('npm run build:prod');
    console.log('TypeScript build complete');
  }
} catch (error) {
  console.error('TypeScript build failed:', error);
}

// Import the compiled Express app
const app = require('../dist/index.js');

// Export the Express app for Vercel
module.exports = app; 
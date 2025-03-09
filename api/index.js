// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// Import the compiled Express app
const app = require('../dist/index.js');

// Export the Express app for Vercel
module.exports = app; 
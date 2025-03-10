// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// Import the compiled Express app using CommonJS syntax
const app = require('../dist/index.js');

// Export the app using CommonJS syntax
module.exports = app; 
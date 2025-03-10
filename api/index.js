// This file serves as the serverless entry point for Vercel
// It imports the compiled Express application from the dist directory

// Import the compiled Express app using ES module syntax
import app from '../dist/index.js';

// Export the app as the default export
export default app; 
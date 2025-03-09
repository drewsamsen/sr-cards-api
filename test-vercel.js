// This script tests the Vercel serverless setup locally
const app = require('./api/index.js');
const http = require('http');

// Create a server using the Express app
const server = http.createServer(app);

// Try different ports if the default is in use
const tryPort = (port) => {
  server.listen(port)
    .on('listening', () => {
      console.log(`Test server running on http://localhost:${port}`);
      console.log('Try accessing:');
      console.log(`- http://localhost:${port}/health`);
      console.log(`- http://localhost:${port}/api/health`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        tryPort(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
};

// Start with port 4000
tryPort(4000); 
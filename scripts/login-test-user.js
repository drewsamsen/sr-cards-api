#!/usr/bin/env node
/**
 * login-test-user.js
 * 
 * Script to test logging in with the test user.
 * This script attempts to log in with the following credentials:
 * - Email: testuser@example.com
 * - Password: password123
 */

const axios = require('axios');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}Testing Login with Test User${colors.reset}\n`);

async function loginTestUser() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testuser@example.com',
      password: 'password123'
    });
    
    console.log(`${colors.green}✅ Login successful!${colors.reset}`);
    console.log(`${colors.bright}User details:${colors.reset}`);
    console.log(`  - ID: ${colors.cyan}${response.data.data.user.id}${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}${response.data.data.user.email}${colors.reset}`);
    console.log(`  - Name: ${colors.cyan}${response.data.data.user.fullName || 'Test User'}${colors.reset}`);
    console.log(`${colors.bright}Authentication:${colors.reset}`);
    console.log(`  - Token: ${colors.cyan}${response.data.data.token.substring(0, 20)}...${colors.reset}`);
    
    return response.data.data;
  } catch (error) {
    console.error(`${colors.red}❌ Login failed!${colors.reset}`);
    
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Error: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
      
      if (error.response.status === 500 && error.response.data.message === 'Invalid login credentials') {
        console.error(`\n${colors.yellow}⚠️ The test user might not exist. Try creating it first:${colors.reset}`);
        console.error(`${colors.cyan}node scripts/create-test-user.js${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error(`\n${colors.yellow}⚠️ The API server is not running. Please start it with:${colors.reset}`);
        console.error(`${colors.cyan}npm run dev${colors.reset}`);
      }
    }
    
    return null;
  }
}

loginTestUser(); 
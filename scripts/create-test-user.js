#!/usr/bin/env node
/**
 * create-test-user.js
 * 
 * Script to create a test user for local development.
 * This script creates a user with the following credentials:
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

console.log(`${colors.bright}${colors.cyan}Creating Test User${colors.reset}\n`);

async function createTestUser() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email: 'testuser@example.com',
      password: 'password123',
      fullName: 'Test User'
    });
    
    console.log(`${colors.green}✅ User created successfully!${colors.reset}`);
    console.log(`${colors.bright}User details:${colors.reset}`);
    console.log(`  - ID: ${colors.cyan}${response.data.data.user.id}${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}${response.data.data.user.email}${colors.reset}`);
    console.log(`  - Name: ${colors.cyan}${response.data.data.user.fullName || 'Test User'}${colors.reset}`);
    
    return response.data.data.user;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log(`${colors.yellow}⚠️ User already exists${colors.reset}`);
      return { id: 'existing-user', email: 'testuser@example.com' };
    } else {
      console.error(`${colors.red}❌ Failed to create user!${colors.reset}`);
      if (error.response) {
        console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
        console.error(`${colors.red}Error: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
      } else {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error(`\n${colors.yellow}⚠️ The API server is not running. Please start it with:${colors.reset}`);
        console.error(`${colors.cyan}npm run dev${colors.reset}`);
      }
      
      return null;
    }
  }
}

createTestUser(); 
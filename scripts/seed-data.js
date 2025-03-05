#!/usr/bin/env node
/**
 * seed-data.js
 * 
 * Phase 2 of the setup process: Data seeding
 * This script:
 * 1. Creates a test user
 * 2. Creates sample decks for the test user
 * 
 * IMPORTANT: The API server must be running before executing this script.
 */

const axios = require('axios');
const { execSync } = require('child_process');

// ANSI color codes for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

console.log(`${colors.bright}${colors.blue}Card API Development Environment Setup - Phase 2${colors.reset}\n`);
console.log(`${colors.dim}This script will seed your database with test data.${colors.reset}\n`);

// Check if the API server is running
async function checkServerStatus() {
  try {
    await axios.get('http://localhost:3000/api/health');
    return true;
  } catch (error) {
    return false;
  }
}

function runCommand(command, description) {
  console.log(`${colors.yellow}→ ${description}...${colors.reset}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`${colors.green}✓ Done!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function seedData() {
  try {
    // Check if the API server is running
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
      console.log(`${colors.red}✗ API server is not running!${colors.reset}`);
      console.log(`${colors.yellow}→ Please start the API server with: ${colors.reset}npm run dev`);
      process.exit(1);
    }

    console.log(`${colors.green}✓ API server is running${colors.reset}`);

    // Create test user
    let userCreated = runCommand('node scripts/create-test-user.js', 'Creating test user');
    if (!userCreated) {
      console.warn(`${colors.yellow}⚠ Warning: Test user creation failed. User might already exist.${colors.reset}`);
    }

    // Create sample decks
    let decksCreated = runCommand('node scripts/create-sample-decks.js', 'Creating sample decks');
    if (!decksCreated) {
      console.warn(`${colors.yellow}⚠ Warning: Sample deck creation failed. Decks might already exist.${colors.reset}`);
    }

    console.log(`\n${colors.green}${colors.bright}✓ Phase 2 setup completed successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}You can now use the API with:${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}testuser@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}password123${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Setup failed!${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

seedData(); 
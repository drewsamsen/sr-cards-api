#!/usr/bin/env node
/**
 * seed-data.js
 * 
 * Phase 2 of the setup process: Data seeding
 * This script:
 * 1. Creates two test users
 * 2. Creates sample decks for each test user
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

// Create a user with the given credentials
async function createUser(email, password, fullName) {
  try {
    console.log(`${colors.yellow}→ Creating user ${email}...${colors.reset}`);
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password,
      fullName
    });
    console.log(`${colors.green}✓ User created: ${email}${colors.reset}`);
    return response.data.data.user;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log(`${colors.yellow}⚠ User ${email} already exists${colors.reset}`);
      // Try to login to get the user data
      try {
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          email,
          password
        });
        return loginResponse.data.data.user;
      } catch (loginError) {
        console.error(`${colors.red}✗ Could not login as existing user: ${email}${colors.reset}`);
        return null;
      }
    } else {
      console.error(`${colors.red}✗ Error creating user ${email}: ${error.message}${colors.reset}`);
      return null;
    }
  }
}

// Create decks for a user
async function createDecksForUser(token, decks) {
  const results = [];
  
  for (const deck of decks) {
    try {
      console.log(`${colors.yellow}→ Creating deck "${deck.name}"...${colors.reset}`);
      const response = await axios.post('http://localhost:3000/api/decks', deck, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`${colors.green}✓ Deck created: ${deck.name}${colors.reset}`);
      results.push(response.data.data.deck);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(`${colors.yellow}⚠ Deck "${deck.name}" already exists${colors.reset}`);
      } else {
        console.error(`${colors.red}✗ Error creating deck "${deck.name}": ${error.message}${colors.reset}`);
      }
    }
  }
  
  return results;
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

    // Create first test user
    const user1 = await createUser(
      'testuser1@example.com',
      'password123',
      'Test User One'
    );
    
    if (user1) {
      // Login to get token
      const loginResponse1 = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'testuser1@example.com',
        password: 'password123'
      });
      
      const token1 = loginResponse1.data.data.token;
      
      // Create decks for first user
      await createDecksForUser(token1, [
        { 
          name: 'JavaScript Fundamentals', 
          description: 'Core concepts of JavaScript programming' 
        },
        { 
          name: 'React Hooks', 
          description: 'All about React hooks and their usage' 
        },
        { 
          name: 'CSS Grid & Flexbox', 
          description: 'Modern CSS layout techniques' 
        }
      ]);
    }
    
    // Create second test user
    const user2 = await createUser(
      'testuser2@example.com',
      'password123',
      'Test User Two'
    );
    
    if (user2) {
      // Login to get token
      const loginResponse2 = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'testuser2@example.com',
        password: 'password123'
      });
      
      const token2 = loginResponse2.data.data.token;
      
      // Create decks for second user
      await createDecksForUser(token2, [
        { 
          name: 'TypeScript Basics', 
          description: 'Introduction to TypeScript' 
        },
        { 
          name: 'SQL Queries', 
          description: 'Common SQL queries and patterns' 
        },
        { 
          name: 'Git Commands', 
          description: 'Essential Git commands for daily use' 
        }
      ]);
    }

    console.log(`\n${colors.green}${colors.bright}✓ Phase 2 setup completed successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}You can now use the API with either of these accounts:${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}testuser1@example.com${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}testuser2@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}password123${colors.reset} (same for both)`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Setup failed!${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

seedData(); 
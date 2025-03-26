#!/usr/bin/env node
/**
 * seed-data.js
 * 
 * Phase 2 of the setup process: Data seeding
 * This script:
 * 1. Creates two test users
 * 2. Creates sample decks for each test user
 * 3. Adds sample cards to each deck
 * 
 * IMPORTANT: The API server must be running before executing this script.
 */

const { execSync } = require('child_process');
require('dotenv').config();

// Import shared utilities
const { log, checkServerStatus, loginUser, createDeck, createCardsForDeck } = require('./shared/api-utils');
const { DEMO_USER, DEMO_DECKS } = require('./shared/demo-content');

// Configure API base URL - can be overridden by environment variable
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

log.header('Card API Development Environment Setup - Phase 2');
log.info('This script will seed your database with test data.');
log.info(`Using API at: ${API_BASE_URL}`);

function runCommand(command, description) {
  log.step(`${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    log.success('Done!');
    return true;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return false;
  }
}

// Create a user with the given credentials
async function createUser(email, password, fullName) {
  try {
    log.step(`Creating user ${email}...`);
    
    // Add demo user metadata if this is the demo user
    const metadata = email === DEMO_USER.email 
      ? { full_name: fullName, ...DEMO_USER.metadata }
      : { full_name: fullName };
    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        metadata
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log.success(`User created: ${email}`);
      log.info(`User ID: ${data.data.user.id}`);
      return data.data.user;
    } else if (response.status === 409) {
      log.warning(`User ${email} already exists`);
      // Try to login to get the user data
      try {
        const loginData = await loginUser(API_BASE_URL, email, password);
        if (loginData && loginData.user) {
          log.info(`User ID: ${loginData.user.id}`);
          return loginData.user;
        }
        throw new Error('Failed to login');
      } catch (loginError) {
        log.error(`Could not login as existing user: ${email}`);
        return null;
      }
    } else {
      log.error(`Error creating user ${email}: ${data.message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    log.error(`Error creating user ${email}: ${error.message}`);
    return null;
  }
}

// Create decks for a user
async function createDecksForUser(token, decks) {
  const results = [];
  
  for (const deck of decks) {
    const createdDeck = await createDeck(API_BASE_URL, token, deck.name, deck.description);
    if (createdDeck) {
      results.push(createdDeck);
    }
  }
  
  return results;
}

async function seedData() {
  try {
    // Check if the API server is running
    const serverRunning = await checkServerStatus(API_BASE_URL);
    if (!serverRunning) {
      log.error('API server is not running!');
      log.warning('Please start the API server with: npm run dev');
      process.exit(1);
    }

    log.success('API server is running');

    // Create first test user
    const user1 = await createUser(
      'testuser1@example.com',
      'password123',
      'Test User One'
    );
    
    if (user1) {
      // Login to get token
      const loginData1 = await loginUser(API_BASE_URL, 'testuser1@example.com', 'password123');
      
      if (!loginData1 || !loginData1.token) {
        log.error('Failed to login as test user 1');
        process.exit(1);
      }
      
      const token1 = loginData1.token;
      
      // Create decks for first user
      const user1Decks = await createDecksForUser(token1, [
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
      
      // Add cards to JavaScript Fundamentals deck
      if (user1Decks.length > 0) {
        await createCardsForDeck(API_BASE_URL, token1, user1Decks[0].id, [
          {
            front: "What is a closure in JavaScript?",
            back: "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope."
          },
          {
            front: "What is the difference between let and var?",
            back: "let is block-scoped while var is function-scoped. let was introduced in ES6."
          },
          {
            front: "What is a Promise?",
            back: "A Promise is an object representing the eventual completion or failure of an asynchronous operation."
          }
        ]);
      }
      
      // Add cards to React Hooks deck
      if (user1Decks.length > 1) {
        await createCardsForDeck(API_BASE_URL, token1, user1Decks[1].id, [
          {
            front: "What is useState?",
            back: "useState is a Hook that lets you add React state to function components."
          },
          {
            front: "What is useEffect?",
            back: "useEffect is a Hook that lets you perform side effects in function components."
          },
          {
            front: "What is useContext?",
            back: "useContext is a Hook that lets you subscribe to React context without introducing nesting."
          }
        ]);
      }
      
      // Add cards to CSS Grid & Flexbox deck
      if (user1Decks.length > 2) {
        await createCardsForDeck(API_BASE_URL, token1, user1Decks[2].id, [
          {
            front: "What is the main difference between Flexbox and Grid?",
            back: "Flexbox is one-dimensional (row OR column) while Grid is two-dimensional (rows AND columns)."
          },
          {
            front: "How do you center an element with Flexbox?",
            back: "Use display: flex; justify-content: center; align-items: center; on the parent element."
          },
          {
            front: "What is the fr unit in CSS Grid?",
            back: "fr is a fractional unit that represents a fraction of the available space in the grid container."
          }
        ]);
      }
    }
    
    // Create demo user
    const demoUser = await createUser(
      DEMO_USER.email,
      DEMO_USER.password,
      DEMO_USER.fullName
    );
    
    if (demoUser) {
      // Login to get token
      const loginData2 = await loginUser(API_BASE_URL, DEMO_USER.email, DEMO_USER.password);
      
      if (!loginData2 || !loginData2.token) {
        log.error('Failed to login as demo user');
        process.exit(1);
      }
      
      const token2 = loginData2.token;
      
      // Create all demo decks from shared content
      const demoDecks = await createDecksForUser(token2, DEMO_DECKS);
      
      // Add cards to each deck
      for (let i = 0; i < demoDecks.length; i++) {
        if (demoDecks[i] && DEMO_DECKS[i] && DEMO_DECKS[i].cards) {
          await createCardsForDeck(API_BASE_URL, token2, demoDecks[i].id, DEMO_DECKS[i].cards);
        }
      }
    }

    log.success('\nPhase 2 setup completed successfully!');
    log.info('\nYou can now use the API with these accounts:');
    log.info('  - Email: testuser1@example.com');
    log.info('  - Password: password123');
    log.info(`  - Email: ${DEMO_USER.email}`);
    log.info(`  - Password: ${DEMO_USER.password}`);
    
  } catch (error) {
    log.error('\nSetup failed!');
    log.error(error.message);
    process.exit(1);
  }
}

seedData(); 
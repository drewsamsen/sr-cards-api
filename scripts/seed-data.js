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
        // Try to get the existing deck
        try {
          const getResponse = await axios.get(`http://localhost:3000/api/decks/slug/${deck.name.toLowerCase().replace(/\s+/g, '-')}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          results.push(getResponse.data.data.deck);
        } catch (getError) {
          console.error(`${colors.red}✗ Could not retrieve existing deck: ${deck.name}${colors.reset}`);
        }
      } else {
        console.error(`${colors.red}✗ Error creating deck "${deck.name}": ${error.message}${colors.reset}`);
      }
    }
  }
  
  return results;
}

// Create cards for a deck
async function createCardsForDeck(token, deckId, cards) {
  const results = [];
  
  for (const card of cards) {
    try {
      console.log(`${colors.yellow}→ Creating card for deck ${deckId}...${colors.reset}`);
      const response = await axios.post(`http://localhost:3000/api/decks/${deckId}/cards`, {
        front: card.front,
        back: card.back
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`${colors.green}✓ Card created${colors.reset}`);
      results.push(response.data.data.card);
    } catch (error) {
      console.error(`${colors.red}✗ Error creating card: ${error.message}${colors.reset}`);
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
        await createCardsForDeck(token1, user1Decks[0].id, [
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
        await createCardsForDeck(token1, user1Decks[1].id, [
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
        await createCardsForDeck(token1, user1Decks[2].id, [
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
      const user2Decks = await createDecksForUser(token2, [
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
      
      // Add cards to TypeScript Basics deck
      if (user2Decks.length > 0) {
        await createCardsForDeck(token2, user2Decks[0].id, [
          {
            front: "What is TypeScript?",
            back: "TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale."
          },
          {
            front: "What is an interface in TypeScript?",
            back: "An interface is a way to define a contract on a function or object in TypeScript."
          },
          {
            front: "What is the 'any' type?",
            back: "The 'any' type is a type that disables type checking and effectively allows all types to be used."
          }
        ]);
      }
      
      // Add cards to SQL Queries deck
      if (user2Decks.length > 1) {
        await createCardsForDeck(token2, user2Decks[1].id, [
          {
            front: "What is a JOIN in SQL?",
            back: "A JOIN clause is used to combine rows from two or more tables, based on a related column between them."
          },
          {
            front: "What is the difference between WHERE and HAVING?",
            back: "WHERE filters rows before grouping, while HAVING filters groups after GROUP BY is applied."
          },
          {
            front: "What is an INDEX in SQL?",
            back: "An INDEX is a database structure that improves the speed of data retrieval operations on a database table."
          }
        ]);
      }
      
      // Add cards to Git Commands deck
      if (user2Decks.length > 2) {
        await createCardsForDeck(token2, user2Decks[2].id, [
          {
            front: "What does 'git pull' do?",
            back: "git pull fetches changes from a remote repository and merges them into the current branch."
          },
          {
            front: "What is the difference between 'git merge' and 'git rebase'?",
            back: "git merge creates a new commit that combines two branches, while git rebase moves or combines a sequence of commits to a new base commit."
          },
          {
            front: "How do you create a new branch in Git?",
            back: "Use 'git branch <branch-name>' to create a new branch, then 'git checkout <branch-name>' to switch to it. Or use 'git checkout -b <branch-name>' to do both in one command."
          }
        ]);
      }
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
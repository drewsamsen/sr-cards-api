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

// Configure API base URL - can be overridden by environment variable
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

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
console.log(`${colors.cyan}Using API at: ${API_BASE_URL}${colors.reset}\n`);

// Check if the API server is running
async function checkServerStatus() {
  try {
    console.log(`${colors.yellow}→ Checking API server at ${API_BASE_URL}/api/health...${colors.reset}`);
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
    console.log(`${colors.green}✓ API server responded with status: ${response.status}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error connecting to API server: ${error.message}${colors.reset}`);
    // Log additional details if available
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Data: ${JSON.stringify(error.response.data)}${colors.reset}`);
    } else if (error.request) {
      console.error(`${colors.red}No response received from server${colors.reset}`);
    }
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
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email,
      password,
      fullName
    });
    console.log(`${colors.green}✓ User created: ${email}${colors.reset}`);
    console.log(`${colors.dim}User ID: ${response.data.data.user.id}${colors.reset}`);
    return response.data.data.user;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log(`${colors.yellow}⚠ User ${email} already exists${colors.reset}`);
      // Try to login to get the user data
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email,
          password
        });
        console.log(`${colors.dim}User ID: ${loginResponse.data.data.user.id}${colors.reset}`);
        return loginResponse.data.data.user;
      } catch (loginError) {
        console.error(`${colors.red}✗ Could not login as existing user: ${email}${colors.reset}`);
        if (loginError.response) {
          console.error(`${colors.red}Response status: ${loginError.response.status}${colors.reset}`);
          console.error(`${colors.red}Response data: ${JSON.stringify(loginError.response.data)}${colors.reset}`);
        }
        return null;
      }
    } else {
      console.error(`${colors.red}✗ Error creating user ${email}: ${error.message}${colors.reset}`);
      if (error.response) {
        console.error(`${colors.red}Response status: ${error.response.status}${colors.reset}`);
        console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
      }
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
      const response = await axios.post(`${API_BASE_URL}/api/decks`, deck, {
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
          const getResponse = await axios.get(`${API_BASE_URL}/api/decks/slug/${deck.name.toLowerCase().replace(/\s+/g, '-')}`, {
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
      const response = await axios.post(`${API_BASE_URL}/api/decks/${deckId}/cards`, {
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
      if (error.response) {
        console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
        console.error(`${colors.red}Response data: ${JSON.stringify(error.response.data)}${colors.reset}`);
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
      const loginResponse1 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
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
    
    // Create second test user - this will be our demo user
    const user2 = await createUser(
      'demo@example.com',
      'demopassword',
      'Demo User'
    );
    
    if (user2) {
      // Login to get token
      const loginResponse2 = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: 'demo@example.com',
        password: 'demopassword'
      });
      
      const token2 = loginResponse2.data.data.token;
      
      // Create decks for demo user
      const user2Decks = await createDecksForUser(token2, [
        { 
          name: 'Spaced Repetition Basics', 
          description: 'Learn about the spaced repetition technique' 
        },
        { 
          name: 'Memory Techniques', 
          description: 'Powerful methods to improve memory' 
        },
        { 
          name: 'Tech Startup Buzzwords', 
          description: 'Essential terminology for navigating the startup ecosystem' 
        },
        {
          name: 'SAT Vocabulary',
          description: 'Advanced vocabulary words commonly found on standardized tests'
        },
        {
          name: 'Logical Fallacies',
          description: 'Common reasoning errors that undermine arguments'
        }
      ]);
      
      // Add cards to Spaced Repetition Basics deck
      if (user2Decks.length > 0) {
        await createCardsForDeck(token2, user2Decks[0].id, [
          {
            front: "What is spaced repetition?",
            back: "Spaced repetition is a learning technique that incorporates increasing intervals of time between subsequent review of previously learned material to exploit the psychological spacing effect."
          },
          {
            front: "Who developed the first spaced repetition system?",
            back: "Sebastian Leitner developed the Leitner system in the 1970s, which is considered one of the first practical spaced repetition systems."
          },
          {
            front: "What is the forgetting curve?",
            back: "The forgetting curve, discovered by Hermann Ebbinghaus, illustrates the decline of memory retention over time. It shows how information is lost when there is no attempt to retain it."
          }
        ]);
      }
      
      // Add cards to Memory Techniques deck
      if (user2Decks.length > 1) {
        await createCardsForDeck(token2, user2Decks[1].id, [
          {
            front: "What is the method of loci?",
            back: "The method of loci (memory palace) is a mnemonic device that relies on spatial memory to visualize familiar locations to help remember information."
          },
          {
            front: "What is chunking in memory techniques?",
            back: "Chunking is a memory technique that involves grouping individual pieces of information into larger units to make them easier to remember."
          },
          {
            front: "What is the major system?",
            back: "The major system is a mnemonic technique used to aid in memorizing numbers by converting them into more memorable consonant sounds, then into words by adding vowels."
          }
        ]);
      }
      
      // Add cards to Tech Startup Buzzwords deck
      if (user2Decks.length > 2) {
        await createCardsForDeck(token2, user2Decks[2].id, [
          {
            front: "MVP",
            back: "Minimum Viable Product — aka the version that barely works but proves we're \"building in public.\""
          },
          {
            front: "Pivot",
            back: "When your original idea flops and you change direction while pretending it was intentional."
          },
          {
            front: "Runway",
            back: "The number of months until we run out of money and start calling angel investors \"again.\""
          },
          {
            front: "Disruptive Innovation",
            back: "We do what others do, but with an app and a pitch deck."
          },
          {
            front: "Unicorn",
            back: "A startup valued at $1 billion — often before it makes a single dollar."
          },
          {
            front: "Growth Hacking",
            back: "Marketing, but with more caffeine and no budget."
          },
          {
            front: "Product-Market Fit",
            back: "That magical moment when people actually want what you're building — still loading…"
          },
          {
            front: "Web3",
            back: "Something to do with crypto, ownership, and vibes. Still unclear."
          },
          {
            front: "Burn Rate",
            back: "How fast we're setting investor money on fire each month."
          },
          {
            front: "Scalable",
            back: "Sounds impressive, means \"we hope this can make money someday.\""
          },
          {
            front: "Thought Leader",
            back: "Someone who posts long threads on X (formerly Twitter) and uses phrases like \"the future of work.\""
          }
        ]);
      }
      
      // Add cards to SAT Vocabulary deck
      if (user2Decks.length > 3) {
        await createCardsForDeck(token2, user2Decks[3].id, [
          {
            front: "Abate",
            back: "v. /uh-BAYT/\n\nto reduce in intensity or amount\n\n\"The storm finally began to abate, and the sun peeked through the clouds.\""
          },
          {
            front: "Cacophony",
            back: "n. /kuh-KAW-fuh-nee/\n\na harsh, discordant mixture of sounds\n\n\"The cacophony of car horns made it impossible to concentrate.\""
          },
          {
            front: "Ubiquitous",
            back: "adj. /yoo-BIK-wih-tuss/\n\npresent or existing everywhere\n\n\"Cell phones are so ubiquitous that it's hard to imagine life without them.\""
          },
          {
            front: "Mollify",
            back: "v. /MAH-luh-fy/\n\nto calm or soothe someone who is angry or upset\n\n\"She tried to mollify her friend by offering a heartfelt apology.\""
          },
          {
            front: "Lethargic",
            back: "adj. /luh-THAR-jik/\n\nsluggish, lacking energy or enthusiasm\n\n\"After staying up all night, he felt too lethargic to get out of bed.\""
          }
        ]);
      }
      
      // Add cards to Logical Fallacies deck
      if (user2Decks.length > 4) {
        await createCardsForDeck(token2, user2Decks[4].id, [
          {
            front: "Ad Hominem",
            back: "Attacking the person instead of addressing their argument.\n\nExample: \"You can't trust his economic theory because he went bankrupt once.\""
          },
          {
            front: "Straw Man",
            back: "Misrepresenting someone's argument to make it easier to attack.\n\nExample: \"Vegans want us all to stop eating any animal products immediately, which would destroy the economy.\""
          },
          {
            front: "False Dilemma",
            back: "Presenting only two options when more exist.\n\nExample: \"Either we cut education funding or we go bankrupt. There's no other choice.\""
          },
          {
            front: "Appeal to Authority",
            back: "Claiming something is true because an authority figure says it is, without supporting evidence.\n\nExample: \"Dr. Smith has a PhD, so her claim about climate change must be correct.\""
          },
          {
            front: "Slippery Slope",
            back: "Arguing that a small step will inevitably lead to extreme consequences.\n\nExample: \"If we allow same-sex marriage, next people will want to marry their pets!\""
          },
          {
            front: "Post Hoc Ergo Propter Hoc",
            back: "Assuming that because one event followed another, the first caused the second.\n\nExample: \"I wore my lucky socks and we won the game, so my socks caused our victory.\""
          },
          {
            front: "Circular Reasoning",
            back: "Making an argument where the conclusion is included in the premise.\n\nExample: \"The Bible is true because it says so in the Bible.\""
          }
        ]);
      }
    }

    console.log(`\n${colors.green}${colors.bright}✓ Phase 2 setup completed successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}You can now use the API with these accounts:${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}testuser1@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}password123${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}demo@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}demopassword${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Setup failed!${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

seedData(); 
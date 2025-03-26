/**
 * api-utils.js
 * 
 * Shared utilities for API interactions used by multiple scripts
 * - Used by ensure-demo-user.js (production deployment)
 * - Used by seed-data.js (development environment setup)
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
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

/**
 * Logs a message with color formatting
 * @param {string} message - The message to log
 * @param {string} type - The type of message ('info', 'success', 'warning', 'error')
 */
const log = {
  info: (message) => console.log(`${colors.cyan}${message}${colors.reset}`),
  success: (message) => console.log(`${colors.green}✓ ${message}${colors.reset}`),
  warning: (message) => console.log(`${colors.yellow}⚠ ${message}${colors.reset}`),
  error: (message) => console.error(`${colors.red}✗ ${message}${colors.reset}`),
  step: (message) => console.log(`${colors.yellow}→ ${message}${colors.reset}`),
  header: (message) => console.log(`${colors.bright}${colors.blue}${message}${colors.reset}\n`)
};

/**
 * Check if the API server is running
 * @param {string} baseUrl - The base URL of the API
 * @returns {Promise<boolean>} - Whether the server is running
 */
async function checkServerStatus(baseUrl) {
  try {
    log.step(`Checking API server at ${baseUrl}/api/health...`);
    const response = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
    log.success(`API server responded with status: ${response.status}`);
    return true;
  } catch (error) {
    log.error(`Error connecting to API server: ${error.message}`);
    // Log additional details if available
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      log.error(`No response received from server`);
    }
    return false;
  }
}

/**
 * Login as a user and get a token
 * @param {string} baseUrl - The base URL of the API
 * @param {string} email - The email to log in with
 * @param {string} password - The password to log in with
 * @returns {Promise<object|null>} - Login data or null if login failed
 */
async function loginUser(baseUrl, email, password) {
  try {
    log.step(`Logging in as ${email}...`);
    
    const loginUrl = `${baseUrl}/api/auth/login`;
    log.info(`POST ${loginUrl}`);
    
    const response = await axios.post(loginUrl, {
      email,
      password
    });
    
    log.success(`Logged in successfully`);
    return response.data.data;
  } catch (error) {
    log.error(`Error logging in as ${email}: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Create a deck
 * @param {string} baseUrl - The base URL of the API
 * @param {string} token - Authentication token
 * @param {string} name - Deck name
 * @param {string} description - Deck description
 * @returns {Promise<object|null>} - Deck data or null if creation failed
 */
async function createDeck(baseUrl, token, name, description) {
  try {
    log.step(`Creating deck: "${name}"`);
    
    const response = await axios.post(`${baseUrl}/api/decks`, {
      name,
      description
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log.success(`Deck created: ${name}`);
    return response.data.data.deck;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      log.warning(`Deck "${name}" already exists`);
      
      // Try to get the existing deck
      try {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const getResponse = await axios.get(`${baseUrl}/api/decks/slug/${slug}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return getResponse.data.data.deck;
      } catch (getError) {
        log.error(`Could not retrieve existing deck: ${name}`);
        return null;
      }
    } else {
      log.error(`Error creating deck "${name}": ${error.message}`);
      return null;
    }
  }
}

/**
 * Create a card in a deck
 * @param {string} baseUrl - The base URL of the API
 * @param {string} token - Authentication token
 * @param {string} deckId - Deck ID to add the card to
 * @param {string} front - Front content of the card
 * @param {string} back - Back content of the card
 * @returns {Promise<object|null>} - Card data or null if creation failed
 */
async function createCard(baseUrl, token, deckId, front, back) {
  try {
    log.step(`Creating card for deck ${deckId.substring(0, 8)}...`);
    
    const response = await axios.post(`${baseUrl}/api/decks/${deckId}/cards`, {
      front,
      back
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log.success(`Card created`);
    return response.data.data.card;
  } catch (error) {
    log.error(`Error creating card: ${error.message}`);
    return null;
  }
}

/**
 * Creates multiple cards for a deck
 * @param {string} baseUrl - The base URL of the API
 * @param {string} token - Authentication token
 * @param {string} deckId - Deck ID to add cards to
 * @param {Array<{front: string, back: string}>} cards - Array of card data
 * @returns {Promise<Array>} - Array of created cards
 */
async function createCardsForDeck(baseUrl, token, deckId, cards) {
  const results = [];
  
  for (const card of cards) {
    const result = await createCard(baseUrl, token, deckId, card.front, card.back);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

module.exports = {
  colors,
  log,
  checkServerStatus,
  loginUser,
  createDeck,
  createCard,
  createCardsForDeck
};
 
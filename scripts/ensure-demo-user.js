#!/usr/bin/env node
/**
 * ensure-demo-user.js
 * 
 * Production-safe script that ensures the demo user exists
 * This script:
 * 1. Checks if the demo user already exists
 * 2. If not, creates the demo user with credentials
 * 3. Creates the demo decks and cards if needed
 * 
 * Safe to run in production as it only adds demo user if missing
 */

const axios = require('axios');
require('dotenv').config();

// Import shared utilities
const { log } = require('./shared/api-utils');
const { createSupabaseAdminClient, ensureUserExists } = require('./shared/supabase-utils');
const { DEMO_USER, DEMO_DECKS } = require('./shared/demo-content');
const apiUtils = require('./shared/api-utils');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_BASE_URL = process.env.API_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || DEMO_USER.email;
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || DEMO_USER.password;

log.header('Ensuring Demo User Exists');
log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
log.info(`API URL: ${API_BASE_URL}`);

// Initialize Supabase admin client
const supabase = createSupabaseAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
if (!supabase) {
  process.exit(1);
}

/**
 * Create decks and cards for the demo user
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
async function createDemoDecksAndCards(token) {
  const deckPromises = DEMO_DECKS.map(async (deckData) => {
    const deck = await apiUtils.createDeck(API_BASE_URL, token, deckData.name, deckData.description);
    
    if (deck && deckData.cards) {
      await apiUtils.createCardsForDeck(API_BASE_URL, token, deck.id, deckData.cards);
    }
    
    return deck;
  });
  
  await Promise.all(deckPromises);
}

/**
 * Ensure the demo user exists with all necessary content
 */
async function ensureDemoUser() {
  try {
    // Create or get demo user from Supabase
    const demoUser = await ensureUserExists(
      supabase, 
      DEMO_EMAIL, 
      DEMO_PASSWORD, 
      { 
        full_name: DEMO_USER.fullName,
        ...DEMO_USER.metadata
      }
    );
    
    if (!demoUser) {
      log.error('Failed to ensure demo user exists. Aborting.');
      process.exit(1);
    }
    
    // If we confirmed the user already exists, we don't need to recreate decks
    // In production, we should always try to login and verify the token works
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (demoUser.last_sign_in_at && !isProduction) {
      log.success('Demo user already exists with content, no action needed.');
      return;
    }
    
    // Login to get authentication token
    log.info('Attempting to login as demo user to verify credentials...');
    
    try {
      const loginData = await apiUtils.loginUser(API_BASE_URL, DEMO_EMAIL, DEMO_PASSWORD);
      
      if (!loginData) {
        log.error('Login returned null response. API might not be available at this URL.');
        log.info(`Is the API server running at ${API_BASE_URL}?`);
        process.exit(1);
      }
      
      if (!loginData.token) {
        log.error('Login succeeded but no token was returned. API response format may have changed.');
        log.info(`Response data: ${JSON.stringify(loginData)}`);
        process.exit(1);
      }
      
      // Create all decks and cards if this is a new user
      if (!demoUser.last_sign_in_at || isProduction) {
        log.info('Creating demo decks and cards...');
        await createDemoDecksAndCards(loginData.token);
      }
      
      log.success('\nDemo user setup completed successfully!');
      log.info('\nDemo user credentials:');
      log.info(`  - Email: ${DEMO_EMAIL}`);
      log.info(`  - Password: ${DEMO_PASSWORD}`);
      
    } catch (loginError) {
      log.error(`Login attempt failed with error: ${loginError.message}`);
      log.error('Unable to complete demo user setup without successful login.');
      process.exit(1);
    }
  } catch (error) {
    log.error('\nDemo user setup failed!');
    log.error(error.message);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the script
ensureDemoUser(); 
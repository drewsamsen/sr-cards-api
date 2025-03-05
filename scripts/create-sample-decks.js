#!/usr/bin/env node
/**
 * create-sample-decks.js
 * 
 * Script to create sample decks for the test user.
 * This script:
 * 1. Logs in with the test user credentials
 * 2. Creates several sample decks with different topics
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
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
  blue: '\x1b[34m'
};

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log(`${colors.bright}${colors.blue}Creating Sample Decks${colors.reset}\n`);

async function createSampleDecks() {
  try {
    // First, log in to get the user ID and token
    console.log(`${colors.cyan}🔑 Logging in with test user...${colors.reset}`);
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testuser@example.com',
      password: 'password123'
    });
    
    const userId = loginResponse.data.data.user.id;
    const token = loginResponse.data.data.token;
    
    console.log(`${colors.green}✅ Login successful!${colors.reset}`);
    console.log(`${colors.dim}User ID: ${userId}${colors.reset}\n`);
    
    console.log(`${colors.cyan}📚 Creating sample decks...${colors.reset}`);
    
    // Sample decks to create
    const sampleDecks = [
      { name: 'JavaScript Fundamentals', description: 'Core concepts of JavaScript programming' },
      { name: 'React Hooks', description: 'All about React hooks and their usage' },
      { name: 'CSS Grid & Flexbox', description: 'Modern CSS layout techniques' },
      { name: 'TypeScript Basics', description: 'Introduction to TypeScript' },
      { name: 'SQL Queries', description: 'Common SQL queries and patterns' },
      { name: 'Git Commands', description: 'Essential Git commands for daily use' }
    ];
    
    // Create each deck using the API
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    for (const deck of sampleDecks) {
      try {
        const response = await axios.post('http://localhost:3000/api/decks', deck, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`${colors.green}✅ Created deck: ${colors.cyan}${deck.name}${colors.reset} (${response.data.data.deck.id})`);
        successCount++;
      } catch (error) {
        if (error.response && error.response.status === 409) {
          console.log(`${colors.yellow}⚠️ Deck "${colors.cyan}${deck.name}${colors.reset}${colors.yellow}" already exists, skipping${colors.reset}`);
          skipCount++;
        } else {
          console.error(`${colors.red}❌ Error creating deck "${colors.cyan}${deck.name}${colors.reset}${colors.red}": ${
            error.response ? error.response.data.message : error.message
          }${colors.reset}`);
          failCount++;
        }
      }
    }
    
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`  - ${colors.green}${successCount} decks created${colors.reset}`);
    console.log(`  - ${colors.yellow}${skipCount} decks skipped (already exist)${colors.reset}`);
    console.log(`  - ${colors.red}${failCount} decks failed${colors.reset}`);
    
    if (successCount > 0 || skipCount > 0) {
      console.log(`\n${colors.green}${colors.bright}🎉 Sample decks created successfully!${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️ No decks were created. Check the errors above.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error creating sample decks:${colors.reset}`, 
      error.response ? error.response.data.message : error.message);
      
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`\n${colors.yellow}⚠️ The API server is not running. Please start it with:${colors.reset}`);
      console.error(`${colors.cyan}npm run dev${colors.reset}`);
    }
  }
}

createSampleDecks(); 
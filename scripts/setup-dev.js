#!/usr/bin/env node
/**
 * setup-dev.js
 * 
 * Phase 1 of the setup process: Database initialization
 * This script:
 * 1. Checks if Supabase is running
 * 2. Resets the database (applies migrations)
 * 
 * After running this script, start the server and then run seed-data.js
 * to complete the setup process.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

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

console.log(`${colors.bright}${colors.blue}Card API Development Environment Setup - Phase 1${colors.reset}\n`);
console.log(`${colors.dim}This script will set up your database.${colors.reset}\n`);

function runCommand(command, description) {
  console.log(`${colors.yellow}→ ${description}...${colors.reset}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`${colors.green}✓ Done!${colors.reset}`);
    return output;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    throw error;
  }
}

function checkSupabaseStatus() {
  try {
    const output = execSync('npx supabase status', { encoding: 'utf8' });
    // Check for the running message, ignoring any "Stopped services" lines
    return output.includes('supabase local development setup is running');
  } catch (error) {
    return false;
  }
}

// Fallback method to check if Supabase is running by checking if the database port is open
function checkDatabasePort() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    
    // Set a timeout
    socket.setTimeout(timeout);
    
    // Handle connection
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    // Handle errors
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Handle timeout
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Try to connect to the Supabase PostgreSQL port
    socket.connect(54322, '127.0.0.1');
  });
}

async function setup() {
  try {
    // Check if Supabase is running using the status command
    let supabaseRunning = checkSupabaseStatus();
    
    // If the status command didn't work, try checking the database port
    if (!supabaseRunning) {
      console.log(`${colors.yellow}→ Status command check failed, trying port check...${colors.reset}`);
      supabaseRunning = await checkDatabasePort();
    }
    
    if (!supabaseRunning) {
      console.log(`${colors.red}✗ Supabase is not running!${colors.reset}`);
      console.log(`${colors.yellow}→ Please start Supabase with: ${colors.reset}npm run supabase:start`);
      console.log(`${colors.dim}If Supabase is already running, there might be an issue with status detection.${colors.reset}`);
      console.log(`${colors.dim}Try running 'npx supabase status' to verify.${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}✓ Supabase is running${colors.reset}`);

    // Reset the database
    runCommand('npx supabase db reset', 'Resetting database');

    console.log(`\n${colors.green}${colors.bright}✓ Phase 1 setup completed successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log(`${colors.cyan}1. Start the API server:${colors.reset} npm run dev`);
    console.log(`${colors.cyan}2. In a new terminal, run Phase 2 to seed data:${colors.reset} npm run seed:data`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Setup failed!${colors.reset}`);
    process.exit(1);
  }
}

setup(); 
#!/usr/bin/env node
/**
 * complete-setup.js
 * 
 * Complete setup script that runs all setup phases in one command:
 * 1. Checks if Supabase is running
 * 2. Resets the database (applies migrations)
 * 3. Starts the API server temporarily
 * 4. Seeds the database with test users and data
 * 5. Shuts down the server
 * 
 * This script provides a one-step setup process for development.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { setTimeout } = require('timers/promises');

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

console.log(`${colors.bright}${colors.blue}Card API Complete Development Setup${colors.reset}\n`);
console.log(`${colors.dim}This script will set up your database, start the server, seed data, and shut down the server.${colors.reset}\n`);

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

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true); // Port is in use
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false); // Port is free
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, '127.0.0.1');
  });
}

// Wait for server to be ready
async function waitForServer(port, maxWaitTime = 30000, checkInterval = 1000) {
  console.log(`${colors.yellow}→ Waiting for API server to start on port ${port}...${colors.reset}`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const isReady = await isPortInUse(port);
    
    if (isReady) {
      // Give the server a moment to fully initialize routes
      await setTimeout(2000);
      console.log(`${colors.green}✓ API server is ready!${colors.reset}`);
      return true;
    }
    
    await setTimeout(checkInterval);
  }
  
  throw new Error(`Server didn't start within ${maxWaitTime}ms`);
}

async function completeSetup() {
  try {
    // PHASE 1: Check Supabase & Database Setup
    console.log(`${colors.bright}${colors.blue}PHASE 1: Database Setup${colors.reset}\n`);
    
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
    
    console.log(`${colors.green}✓ Phase 1 completed${colors.reset}\n`);
    
    // PHASE 2: Start Server & Seed Data
    console.log(`${colors.bright}${colors.blue}PHASE 2: Server Start & Data Seeding${colors.reset}\n`);
    
    // Make sure the API port is not already in use
    const apiPort = 3000;
    const portInUse = await isPortInUse(apiPort);
    
    if (portInUse) {
      console.log(`${colors.red}✗ Port ${apiPort} is already in use!${colors.reset}`);
      console.log(`${colors.yellow}→ Please stop any running servers on port ${apiPort} and try again.${colors.reset}`);
      process.exit(1);
    }
    
    // Start the API server
    console.log(`${colors.yellow}→ Starting API server...${colors.reset}`);
    
    // Use spawn to start the server in a separate process
    const serverProcess = spawn('npm', ['run', 'dev'], {
      detached: true,
      stdio: 'pipe' // Capture output
    });
    
    let serverOutput = '';
    
    // Capture server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Print important server messages
      if (output.includes('Server running') || output.includes('ERROR')) {
        console.log(`${colors.dim}${output.trim()}${colors.reset}`);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      console.error(`${colors.red}${output.trim()}${colors.reset}`);
    });
    
    // Wait for the server to be ready
    try {
      await waitForServer(apiPort);
    } catch (error) {
      console.error(`${colors.red}✗ Server failed to start: ${error.message}${colors.reset}`);
      console.error(`${colors.red}Server output: ${serverOutput}${colors.reset}`);
      // Kill the server process if it's still running
      process.kill(-serverProcess.pid, 'SIGINT');
      process.exit(1);
    }
    
    // Run seed data script
    console.log(`${colors.yellow}→ Seeding database with test data...${colors.reset}`);
    try {
      execSync('node scripts/seed-data.js', {
        stdio: 'inherit' // Show output
      });
      console.log(`${colors.green}✓ Database seeded successfully${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error seeding database: ${error.message}${colors.reset}`);
      // Kill the server process if it's still running
      process.kill(-serverProcess.pid, 'SIGINT');
      process.exit(1);
    }
    
    // Shutdown server
    console.log(`${colors.yellow}→ Shutting down API server...${colors.reset}`);
    // Kill the server process
    process.kill(-serverProcess.pid, 'SIGINT');
    
    console.log(`${colors.green}✓ Phase 2 completed${colors.reset}\n`);
    
    // Setup complete
    console.log(`\n${colors.green}${colors.bright}✓ Complete setup finished successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}You can now start the API server:${colors.reset}`);
    console.log(`${colors.cyan}$ npm run dev${colors.reset}`);
    console.log(`\n${colors.cyan}Available accounts:${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}testuser1@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}password123${colors.reset}`);
    console.log(`  - Email: ${colors.cyan}demo@example.com${colors.reset}`);
    console.log(`  - Password: ${colors.cyan}demopassword${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}✗ Setup failed!${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the setup
completeSetup(); 
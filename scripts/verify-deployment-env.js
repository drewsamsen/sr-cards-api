#!/usr/bin/env node
/**
 * verify-deployment-env.js
 * 
 * Verifies all required environment variables are set for deployment
 * This script:
 * 1. Checks for required variables
 * 2. Validates values where possible
 * 3. Provides recommendations for fixing issues
 */

require('dotenv').config();
const { log } = require('./shared/api-utils');
const { createSupabaseAdminClient } = require('./shared/supabase-utils');

// List of required environment variables
const requiredVariables = [
  {
    name: 'SUPABASE_URL',
    description: 'URL of the Supabase instance',
    validator: (value) => value && value.startsWith('https://'),
    suggestion: 'Should look like https://your-project-id.supabase.co'
  },
  {
    name: 'SUPABASE_SERVICE_KEY',
    description: 'Service role key for Supabase admin access',
    validator: (value) => value && value.startsWith('eyJ'),
    suggestion: 'Should start with "eyJ" and be quite long. Get this from your Supabase dashboard.'
  },
  {
    name: 'SUPABASE_ANON_KEY',
    description: 'Anonymous key for public Supabase access',
    validator: (value) => value && value.startsWith('eyJ'),
    suggestion: 'Should start with "eyJ" and be quite long. Get this from your Supabase dashboard.'
  },
  {
    name: 'NODE_ENV',
    description: 'Environment (development/production)',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    suggestion: 'Should be one of: development, production, test'
  }
];

// Optional variables that are helpful if set
const optionalVariables = [
  {
    name: 'VERCEL_URL',
    description: 'URL provided by Vercel for the deployment',
    validator: null, // Will be set by Vercel during deployment
    suggestion: 'This is automatically set by Vercel during deployment'
  },
  {
    name: 'API_URL',
    description: 'Custom URL for the API (overrides VERCEL_URL)',
    validator: (value) => value && (value.startsWith('http://') || value.startsWith('https://')),
    suggestion: 'Should include protocol, e.g., https://api.example.com'
  },
  {
    name: 'DEMO_USER_EMAIL',
    description: 'Email for the demo user (optional)',
    validator: (value) => !value || value.includes('@'),
    suggestion: 'Should be a valid email address'
  },
  {
    name: 'DEMO_USER_PASSWORD',
    description: 'Password for the demo user (optional)',
    validator: (value) => !value || value.length >= 8,
    suggestion: 'Should be at least 8 characters long'
  }
];

// Verify Supabase connection
async function verifySupabaseConnection() {
  log.step('Testing Supabase connection...');
  
  const supabase = createSupabaseAdminClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  if (!supabase) {
    log.error('Failed to create Supabase client.');
    return false;
  }
  
  try {
    const { data, error } = await supabase.from('user_settings').select('id').limit(1);
    
    if (error) {
      log.error(`Supabase query failed: ${error.message}`);
      return false;
    }
    
    log.success('Supabase connection successful');
    return true;
  } catch (error) {
    log.error(`Error connecting to Supabase: ${error.message}`);
    return false;
  }
}

// Main verification function
async function verifyEnvironment() {
  log.header('Verifying Deployment Environment');
  log.info(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required variables
  log.info('\nChecking required environment variables:');
  for (const variable of requiredVariables) {
    const value = process.env[variable.name];
    
    if (!value) {
      log.error(`${variable.name} is not set. ${variable.description}`);
      log.info(`Suggestion: ${variable.suggestion}`);
      hasErrors = true;
      continue;
    }
    
    if (variable.validator && !variable.validator(value)) {
      log.error(`${variable.name} has an invalid value.`);
      log.info(`Suggestion: ${variable.suggestion}`);
      hasErrors = true;
      continue;
    }
    
    log.success(`${variable.name} is properly set.`);
  }
  
  // Check optional variables
  log.info('\nChecking optional environment variables:');
  for (const variable of optionalVariables) {
    const value = process.env[variable.name];
    
    if (!value) {
      log.warning(`${variable.name} is not set. ${variable.description}`);
      log.info(`Suggestion: ${variable.suggestion}`);
      hasWarnings = true;
      continue;
    }
    
    if (variable.validator && !variable.validator(value)) {
      log.warning(`${variable.name} has a potentially invalid value.`);
      log.info(`Suggestion: ${variable.suggestion}`);
      hasWarnings = true;
      continue;
    }
    
    log.success(`${variable.name} is properly set.`);
  }
  
  // Test Supabase connection if credentials are provided
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const supabaseConnected = await verifySupabaseConnection();
    if (!supabaseConnected) {
      hasErrors = true;
    }
  }
  
  // Final summary
  log.info('\nVerification Summary:');
  if (hasErrors) {
    log.error('❌ There are critical issues that will prevent deployment from working correctly.');
    log.info('Please fix the errors listed above before deploying.');
  } else if (hasWarnings) {
    log.warning('⚠️ There are warnings, but deployment may still work.');
    log.info('Consider addressing the warnings for optimal setup.');
  } else {
    log.success('✅ All environment variables are properly configured.');
    log.info('The deployment should work correctly.');
  }
  
  return !hasErrors;
}

// Run verification
verifyEnvironment()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    log.error(`Unexpected error during verification: ${error.message}`);
    process.exit(1);
  }); 
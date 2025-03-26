/**
 * supabase-utils.js
 * 
 * Shared utilities for Supabase interactions used by multiple scripts
 * - Used by ensure-demo-user.js (production deployment)
 * - Used by other scripts that need to work with Supabase directly
 */

const { createClient } = require('@supabase/supabase-js');
const { log } = require('./api-utils');

/**
 * Creates a Supabase admin client using service key
 * @param {string} supabaseUrl - Supabase URL 
 * @param {string} supabaseServiceKey - Supabase service role key
 * @returns {Object} Supabase client
 */
function createSupabaseAdminClient(supabaseUrl, supabaseServiceKey) {
  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing Supabase configuration');
    log.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be provided as environment variables');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Check if a user exists by email
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email to check
 * @returns {Promise<Object|null>} User object if found, null if not
 */
async function checkUserExists(supabase, email) {
  log.step(`Checking if user ${email} already exists...`);
  
  try {
    // Check by email
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });
    
    if (error) {
      log.error(`Error listing users: ${error.message}`);
      return null;
    }
    
    const user = data.users.find(user => user.email === email);
    
    if (user) {
      log.success(`User already exists with ID: ${user.id}`);
      return user;
    } else {
      log.warning(`User does not exist yet`);
      return null;
    }
  } catch (error) {
    log.error(`Error checking user: ${error.message}`);
    return null;
  }
}

/**
 * Create a new user with specified properties
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email address
 * @param {string} password - User password
 * @param {Object} userMetadata - User metadata
 * @returns {Promise<Object|null>} Created user or null if failed
 */
async function createUser(supabase, email, password, userMetadata) {
  try {
    log.step(`Creating user: ${email}`);
    
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata || {}
    });
    
    if (userError) {
      log.error(`Error creating user: ${userError.message}`);
      return null;
    }
    
    log.success(`User created with ID: ${userData.user.id}`);
    return userData.user;
  } catch (error) {
    log.error(`Unexpected error creating user: ${error.message}`);
    return null;
  }
}

/**
 * Ensure a user exists, creating them if not
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email to check/create 
 * @param {string} password - Password to set if creating
 * @param {Object} userMetadata - User metadata
 * @returns {Promise<Object|null>} User object
 */
async function ensureUserExists(supabase, email, password, userMetadata = {}) {
  // First check if user exists
  const existingUser = await checkUserExists(supabase, email);
  
  if (existingUser) {
    return existingUser;
  }
  
  // Create the user if they don't exist
  return await createUser(supabase, email, password, userMetadata);
}

module.exports = {
  createSupabaseAdminClient,
  checkUserExists,
  createUser,
  ensureUserExists
}; 
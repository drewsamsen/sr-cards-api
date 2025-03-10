import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(`Supabase URL or keys are missing for ${process.env.NODE_ENV} environment. Auth functionality will not work properly.`);
}

// Define Supabase client options with enhanced session persistence
// These options help maintain longer authentication sessions in serverless environments
// - autoRefreshToken: Automatically refreshes the token before it expires
// - persistSession: Ensures the session is persisted across requests
// - detectSessionInUrl: Disables automatic detection of auth parameters in the URL
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
};

// Create a Supabase client with the anonymous key (for client-side operations)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Create a Supabase client with the service role key (for server-side operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, supabaseOptions);

export { supabaseAnon, supabaseAdmin };
export default supabaseAnon; 
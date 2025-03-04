import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or keys are missing. Auth functionality will not work properly.');
}

// Create a Supabase client with the anonymous key (for client-side operations)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client with the service role key (for server-side operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export { supabaseAnon, supabaseAdmin };
export default supabaseAnon; 
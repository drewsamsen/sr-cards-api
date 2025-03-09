import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Connection pool configuration
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Serverless optimized settings
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
};

// Create a singleton pool instance
let pool: Pool;

// Get or create the database pool
const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // In a production environment, you might want to notify your error tracking service
    });
    
    // Only log connection in non-serverless environments
    if (process.env.NODE_ENV !== 'production') {
      pool.connect()
        .then(() => console.log('Connected to PostgreSQL database'))
        .catch((err) => console.error('Database connection error:', err.message));
    }
  }
  return pool;
};

// Export the pool getter for use in other modules
export default getPool(); 
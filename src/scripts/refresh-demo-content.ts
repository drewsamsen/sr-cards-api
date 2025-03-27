import dotenv from 'dotenv';
import path from 'path';
import demoService from '../services/demoService';
import logger from '../utils/logger';

// Load environment-specific variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

// Load environment files
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

async function main() {
  try {
    logger.info('Starting demo user content refresh');
    
    // First, ensure demo user exists
    const demoUserId = await demoService.ensureDemoUserExists();
    
    if (!demoUserId) {
      logger.error('Failed to ensure demo user exists');
      process.exit(1);
    }
    
    logger.info(`Demo user found/created with ID: ${demoUserId}`);
    
    // Reset the demo user's content
    const success = await demoService.resetDemoUser(demoUserId);
    
    if (success) {
      logger.info('Successfully refreshed demo user content');
      process.exit(0);
    } else {
      logger.error('Failed to refresh demo user content');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Unexpected error in refresh-demo-content script:', error);
    process.exit(1);
  }
}

main(); 
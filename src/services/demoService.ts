import { createClient } from "@supabase/supabase-js";
import demoUserTemplate from "../config/demo-user-template.json";
import demoContentTemplate from "../config/demo-content-template.json";
import logger from "../utils/logger";
import { cardService } from "./card.service";
import { deckService } from "./deck.service";
import { supabaseAdmin } from '../config/supabase';
import { userSettingsService } from './user-settings.service';
import { CreateDeckDTO } from '../models/deck.model';
import { CreateCardDTO } from '../models/card.model';

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface DemoUser {
  id: string;
  email: string;
  lastResetAt: Date;
  resetIntervalMinutes: number;
}

/**
 * Service for managing demo users
 */
class DemoService {
  // Cache of known demo users to avoid frequent DB checks
  private demoUsersCache: Map<string, DemoUser> = new Map();
  private isPollingStarted: boolean = false;

  /**
   * Start the polling mechanism for checking demo users
   * that need to be reset
   */
  public startPolling(): void {
    if (this.isPollingStarted) {
      logger.info('Demo user polling already started, skipping');
      return;
    }

    logger.info('Starting demo user polling');
    this.isPollingStarted = true;
    
    // Check immediately on startup
    this.checkDemoUsersForReset();
    
    // Then check every minute
    setInterval(() => {
      this.checkDemoUsersForReset();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Find all users that are flagged as demo users in their settings
   */
  public async getDemoUsers(): Promise<DemoUser[]> {
    try {
      // Query user_settings to find users with isDemoUser flag
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('user_id, settings, updated_at')
        .filter('settings->isDemoUser', 'eq', true);

      if (error) {
        logger.error('Error finding demo users:', error);
        return [];
      }

      if (!data || data.length === 0) {
        // Also check for isDemoUser in raw_user_meta_data (auth.users)
        const { data: authUsers, error: authError } = await supabaseAdmin
          .from('auth.users')
          .select('id, email, raw_user_meta_data, updated_at')
          .filter('raw_user_meta_data->isDemoUser', 'eq', true);

        if (authError) {
          logger.error('Error finding demo users in auth.users:', authError);
          return [];
        }

        if (!authUsers || authUsers.length === 0) {
          return [];
        }

        // Convert to DemoUser format
        const demoUsers = authUsers.map(user => ({
          id: user.id,
          email: user.email,
          lastResetAt: new Date(user.updated_at),
          resetIntervalMinutes: user.raw_user_meta_data.demoResetInterval || 30
        }));

        // Update cache
        demoUsers.forEach(user => {
          this.demoUsersCache.set(user.id, user);
        });

        return demoUsers;
      }

      // Process user_settings records
      const demoUsers = await Promise.all(
        data.map(async record => {
          // Get user info from auth.users
          const { data: userData, error: userError } = await supabaseAdmin
            .from('auth.users')
            .select('email, raw_user_meta_data')
            .eq('id', record.user_id)
            .single();

          if (userError) {
            logger.error(`Error getting user ${record.user_id}:`, userError);
            return null;
          }

          // Check if reset interval is in user_settings or auth.users metadata
          const resetInterval = 
            (record.settings?.demoResetInterval) || 
            (userData?.raw_user_meta_data?.demoResetInterval) || 
            30;

          const demoUser: DemoUser = {
            id: record.user_id,
            email: userData?.email || '',
            lastResetAt: new Date(record.updated_at),
            resetIntervalMinutes: resetInterval
          };

          // Update cache
          this.demoUsersCache.set(demoUser.id, demoUser);
          
          return demoUser;
        })
      );

      // Filter out nulls (failed lookups)
      return demoUsers.filter(Boolean) as DemoUser[];
    } catch (error) {
      logger.error('Unexpected error in getDemoUsers:', error);
      return [];
    }
  }

  /**
   * Check which demo users are due for a reset
   */
  public async checkDemoUsersForReset(): Promise<void> {
    try {
      logger.info('Checking for demo users that need reset');
      
      // Get all demo users
      const demoUsers = await this.getDemoUsers();
      
      if (demoUsers.length === 0) {
        logger.info('No demo users found');
        return;
      }
      
      logger.info(`Found ${demoUsers.length} demo users`);
      
      // Check each user if they need a reset
      for (const user of demoUsers) {
        try {
          const now = new Date();
          const minutesSinceLastReset = (now.getTime() - user.lastResetAt.getTime()) / (60 * 1000);
          
          logger.info(`Demo user ${user.email} (${user.id}): Last reset ${minutesSinceLastReset.toFixed(1)} minutes ago, interval: ${user.resetIntervalMinutes} minutes`);
          
          if (minutesSinceLastReset >= user.resetIntervalMinutes) {
            logger.info(`Demo user ${user.email} (${user.id}) is due for reset`);
            await this.resetDemoUser(user.id);
          }
        } catch (userError) {
          logger.error(`Error processing demo user ${user.id}:`, userError);
          // Continue with other users
        }
      }
    } catch (error) {
      logger.error('Error checking demo users for reset:', error);
    }
  }

  /**
   * Reset a demo user's content to the initial state
   */
  public async resetDemoUser(userId: string): Promise<boolean> {
    try {
      logger.info(`Resetting demo user ${userId}`);
      
      // 1. Delete all user's cards
      await this.deleteAllUserCards(userId);
      
      // 2. Delete all user's decks
      await this.deleteAllUserDecks(userId);
      
      // 3. Reset user settings
      await this.resetUserSettings(userId);
      
      // 4. Create fresh decks and cards from template
      await this.createDemoContent(userId);
      
      // 5. Update last reset timestamp
      await this.updateLastResetTimestamp(userId);
      
      logger.info(`Successfully reset demo user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error resetting demo user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Delete all cards belonging to a user
   */
  private async deleteAllUserCards(userId: string): Promise<void> {
    logger.info(`Deleting all cards for user ${userId}`);
    
    const { error } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Error deleting cards: ${error.message}`);
    }
  }

  /**
   * Delete all decks belonging to a user
   */
  private async deleteAllUserDecks(userId: string): Promise<void> {
    logger.info(`Deleting all decks for user ${userId}`);
    
    const { error } = await supabaseAdmin
      .from('decks')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Error deleting decks: ${error.message}`);
    }
  }

  /**
   * Reset user settings to template defaults
   */
  private async resetUserSettings(userId: string): Promise<void> {
    logger.info(`Resetting settings for user ${userId}`);
    
    // Use the template settings
    const templateSettings = demoUserTemplate.settings;
    
    // Update the user's settings
    const updated = await userSettingsService.updateUserSettings(userId, templateSettings);
    
    if (!updated) {
      throw new Error('Failed to update user settings');
    }
  }

  /**
   * Create fresh demo content for the user
   */
  private async createDemoContent(userId: string): Promise<void> {
    logger.info(`Creating demo content for user ${userId}`);
    
    // Process each deck in the template
    for (const deckTemplate of demoContentTemplate.decks) {
      try {
        // Create the deck
        const deckData: CreateDeckDTO = {
          name: deckTemplate.name,
          description: deckTemplate.description,
          dailyScaler: 1.0 // Default scaling factor
        };
        
        const deck = await deckService.createDeck(deckData, userId);
        
        if (!deck) {
          logger.error(`Failed to create deck ${deckTemplate.name} for user ${userId}`);
          continue;
        }
        
        // Create cards for this deck
        for (const cardTemplate of deckTemplate.cards) {
          try {
            const cardData: CreateCardDTO = {
              front: cardTemplate.front,
              back: cardTemplate.back
            };
            
            await cardService.createCard(cardData, deck.id, userId);
          } catch (cardError) {
            logger.error(`Error creating card in deck ${deck.id}:`, cardError);
            // Continue with other cards
          }
        }
      } catch (deckError) {
        logger.error(`Error creating deck ${deckTemplate.name}:`, deckError);
        // Continue with other decks
      }
    }
  }

  /**
   * Update the last reset timestamp
   */
  private async updateLastResetTimestamp(userId: string): Promise<void> {
    logger.info(`Updating last reset timestamp for user ${userId}`);
    
    // Update the cache
    const cachedUser = this.demoUsersCache.get(userId);
    if (cachedUser) {
      cachedUser.lastResetAt = new Date();
      this.demoUsersCache.set(userId, cachedUser);
    }
    
    // No need to update the database as the updated_at column will be
    // automatically updated when we save the settings
  }

  /**
   * Ensure a demo user exists with proper setup
   */
  public async ensureDemoUserExists(): Promise<string | null> {
    try {
      logger.info('Ensuring demo user exists');
      
      // Check if demo user already exists
      const demoUsers = await this.getDemoUsers();
      
      // If demo user with the template email exists, return its ID
      const existingDemoUser = demoUsers.find(
        user => user.email === demoUserTemplate.email
      );
      
      if (existingDemoUser) {
        logger.info(`Demo user already exists with ID ${existingDemoUser.id}`);
        return existingDemoUser.id;
      }
      
      // Create new demo user
      logger.info('Creating new demo user');
      
      // 1. Create user in auth.users
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: demoUserTemplate.email,
        password: demoUserTemplate.password,
        email_confirm: true,
        user_metadata: {
          full_name: demoUserTemplate.fullName,
          ...demoUserTemplate.metadata
        }
      });
      
      if (userError || !userData?.user) {
        logger.error('Error creating demo user:', userError);
        return null;
      }
      
      const userId = userData.user.id;
      logger.info(`Created demo user with ID ${userId}`);
      
      // 2. Create user settings
      await userSettingsService.createDefaultSettings(userId);
      
      // 3. Update user settings with template values
      await userSettingsService.updateUserSettings(userId, demoUserTemplate.settings);
      
      // 4. Create demo content
      await this.createDemoContent(userId);
      
      // 5. Update cache
      this.demoUsersCache.set(userId, {
        id: userId,
        email: demoUserTemplate.email,
        lastResetAt: new Date(),
        resetIntervalMinutes: demoUserTemplate.metadata.demoResetInterval
      });
      
      logger.info(`Demo user setup completed for ${userId}`);
      return userId;
    } catch (error) {
      logger.error('Error ensuring demo user exists:', error);
      return null;
    }
  }
}

export default new DemoService(); 
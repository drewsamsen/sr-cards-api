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
        // Also check for isDemoUser in raw_user_meta_data (auth users)
        const { data: authUsers, error: authError } = await supabaseAdmin
          .from('auth.users')
          .select('id, email, raw_user_meta_data, updated_at')
          .filter('raw_user_meta_data->isDemoUser', 'eq', true);

        if (authError) {
          logger.error('Error finding demo users in auth users:', authError);
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
          // Get user info from auth users
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
    
    try {
      const settings = {
        ...demoUserTemplate.settings,
        isDemoUser: true,
        demoResetInterval: 30 // Minutes until reset
      };
      
      await userSettingsService.updateUserSettings(userId, settings);
    } catch (error) {
      logger.error(`Error resetting user settings for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create demo content based on templates
   */
  private async createDemoContent(userId: string): Promise<void> {
    logger.info(`Creating demo content for user ${userId}`);
    
    try {
      // Get template data
      const decksToCreate = demoContentTemplate.decks;
      
      // Create each deck and its cards
      for (const deckTemplate of decksToCreate) {
        const createDeckDto: CreateDeckDTO = {
          name: deckTemplate.name,
          description: deckTemplate.description,
          dailyScaler: 1.0
        };
        
        // Create the deck
        const deck = await deckService.createDeck(createDeckDto, userId);
        
        if (!deck) {
          logger.error(`Failed to create deck "${deckTemplate.name}" for user ${userId}`);
          continue;
        }
        
        // Create cards for this deck
        if (deckTemplate.cards && deckTemplate.cards.length > 0) {
          for (const cardTemplate of deckTemplate.cards) {
            const createCardDto: CreateCardDTO = {
              front: cardTemplate.front,
              back: cardTemplate.back
            };
            
            try {
              await cardService.createCard(createCardDto, deck.id, userId);
            } catch (cardError) {
              logger.error(`Error creating card in deck ${deck.id}:`, cardError);
              // Continue with next card
            }
          }
        }
      }
      
      logger.info(`Successfully created demo content for user ${userId}`);
    } catch (error) {
      logger.error(`Error creating demo content for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update last reset timestamp
   */
  private async updateLastResetTimestamp(userId: string): Promise<void> {
    const now = new Date();
    
    try {
      // Update user metadata
      const { error } = await supabaseAdmin
        .from('auth.users')
        .update({
          updated_at: now.toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        logger.error(`Error updating last reset timestamp for user ${userId}:`, error);
      }
    } catch (error) {
      logger.error(`Error updating last reset timestamp for user ${userId}:`, error);
    }
  }

  /**
   * Ensure that a demo user exists and has content
   * Creates one if it doesn't exist
   */
  public async ensureDemoUserExists(): Promise<string> {
    logger.info('Ensuring demo user exists');
    
    try {
      // Check if the demo user already exists
      const { data, error } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', demoUserTemplate.email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        logger.error('Error checking for demo user:', error);
        throw error;
      }
      
      if (data && data.id) {
        logger.info(`Demo user already exists with ID: ${data.id}`);
        
        // Ensure demo user settings
        await this.ensureDemoUserSettings(data.id);
        
        return data.id;
      }
      
      // Create the demo user since it doesn't exist
      return await this.createDemoUser();
    } catch (error) {
      logger.error('Error ensuring demo user exists:', error);
      throw error;
    }
  }

  /**
   * Create a new demo user
   */
  private async createDemoUser(): Promise<string> {
    logger.info('Creating new demo user');
    
    try {
      // 1. Create user in auth.users
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: demoUserTemplate.email,
        password: demoUserTemplate.password,
        email_confirm: true,
        user_metadata: {
          full_name: demoUserTemplate.fullName,
          isDemoUser: true,
          demoResetInterval: 30
        }
      });
      
      if (error) {
        logger.error('Error creating demo user:', error);
        throw error;
      }
      
      const userId = data.user.id;
      logger.info(`Created demo user with ID: ${userId}`);
      
      // 2. Ensure settings are set up
      await this.ensureDemoUserSettings(userId);
      
      // 3. Create initial content
      await this.createDemoContent(userId);
      
      return userId;
    } catch (error) {
      logger.error('Error creating demo user:', error);
      throw error;
    }
  }

  /**
   * Ensure the demo user has the required settings
   */
  private async ensureDemoUserSettings(userId: string): Promise<void> {
    logger.info(`Ensuring demo user settings for user ${userId}`);
    
    try {
      // Check if settings exist
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        logger.error(`Error checking settings for user ${userId}:`, error);
      }
      
      // Create or update settings
      const settings = {
        ...demoUserTemplate.settings,
        isDemoUser: true,
        demoResetInterval: 30
      };
      
      if (!data) {
        // Create new settings
        await userSettingsService.createDefaultSettings(userId);
        await userSettingsService.updateUserSettings(userId, settings);
      } else {
        // Update existing settings
        await userSettingsService.updateUserSettings(userId, settings);
      }
      
      logger.info(`Demo user settings ensured for user ${userId}`);
    } catch (error) {
      logger.error(`Error ensuring demo user settings for ${userId}:`, error);
      throw error;
    }
  }
}

export default new DemoService(); 
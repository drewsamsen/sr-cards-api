import { supabaseAdmin } from '../config/supabase';
import { snakeToCamelObject } from '../utils';
import defaultSettingsConfig from '../config/default-settings.json';
import { fsrsService } from './fsrs.service';

// Simple in-memory cache to prevent infinite loops
const userSettingsCache: {
  [userId: string]: {
    settings: UserSettings | null;
    timestamp: number;
    inProgress: boolean;
  }
} = {};

// Cache expiration time (30 seconds in milliseconds)
const CACHE_EXPIRATION = 30 * 1000;

export interface UserSettings {
  id: string;
  userId: string;
  settings: {
    theme: string;
    showAnswerTimer: boolean;
    notifications: {
      enabled: boolean;
      reminderTime: string;
      reminderDays: string[];
    };
    learning: {
      newCardsPerDay: number;
      maxReviewsPerDay: number;
    };
    fsrsParams: {
      requestRetention: number;
      maximumInterval: number;
      w: number[];
      enableFuzz: boolean;
      enableShortTerm: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Type for settings update
export type UserSettingsUpdate = Partial<UserSettings['settings']>;

export const userSettingsService = {
  /**
   * Create default settings for a user
   */
  async createDefaultSettings(userId: string): Promise<UserSettings | null> {
    console.log(`Creating default settings for user ${userId}`);
    try {
      // Validate userId
      if (!userId) {
        console.error('Cannot create default settings: userId is required');
        return null;
      }

      // Get default settings from config file
      const defaultSettings = defaultSettingsConfig;
      
      if (!defaultSettings) {
        console.error('Default settings configuration is missing or invalid');
        return null;
      }

      // Check if settings already exist
      const existingSettings = await this.getUserSettings(userId);
      if (existingSettings) {
        console.log(`Settings already exist for user ${userId}`);
        return existingSettings;
      }

      // Insert new settings with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabaseAdmin
            .from('user_settings')
            .insert({
              user_id: userId,
              settings: defaultSettings
            })
            .select()
            .single();
          
          if (error) {
            // Check if it's a conflict error (settings were created in parallel)
            if (error.code === '23505') { // Unique constraint violation
              console.log(`Settings were created in parallel for user ${userId}, retrieving existing settings`);
              return await this.getUserSettings(userId);
            }
            
            console.error(`Error creating default settings (attempt ${retryCount + 1}): ${error.message}`);
            retryCount++;
            
            if (retryCount >= maxRetries) {
              console.error(`Failed to create default settings after ${maxRetries} attempts`);
              return null;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            continue;
          }
          
          if (!data) {
            console.error(`No data returned when creating default settings`);
            retryCount++;
            continue;
          }
          
          const settings = snakeToCamelObject(data) as UserSettings;
          
          // Update the cache
          userSettingsCache[userId] = {
            settings,
            timestamp: Date.now(),
            inProgress: false
          };
          
          console.log(`Default settings created successfully for user ${userId}`);
          return settings;
        } catch (insertError: any) {
          console.error(`Exception during settings creation (attempt ${retryCount + 1}): ${insertError.message}`);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            console.error(`Failed to create default settings after ${maxRetries} attempts`);
            return null;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`Exception in createDefaultSettings: ${error.message}`);
      return null;
    }
  },

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      // Validate userId
      if (!userId) {
        console.error('Cannot get user settings: userId is required');
        return null;
      }
      
      // Check if we have a request in progress for this user
      if (userSettingsCache[userId] && userSettingsCache[userId].inProgress) {
        console.log(`[DEBUG] getUserSettings call for ${userId} is already in progress, returning cached value`);
        return userSettingsCache[userId].settings;
      }
      
      // Check if we have a cached value that's still valid
      const cachedSettings = userSettingsCache[userId];
      if (cachedSettings && (Date.now() - cachedSettings.timestamp) < CACHE_EXPIRATION) {
        console.log(`[DEBUG] Returning cached settings for user ${userId}`);
        return cachedSettings.settings;
      }
      
      // Mark this request as in progress to prevent infinite loops
      userSettingsCache[userId] = {
        settings: null,
        timestamp: Date.now(),
        inProgress: true
      };

      console.log(`Getting settings for user ${userId}`);
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found
          console.log(`No settings found for user ${userId}`);
          userSettingsCache[userId].inProgress = false;
          return null;
        }
        console.error(`Error getting user settings for ${userId}: ${error.message}`, {
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        userSettingsCache[userId].inProgress = false;
        return null;
      }

      if (!data) {
        console.log(`No settings data returned for user ${userId}`);
        userSettingsCache[userId].inProgress = false;
        return null;
      }

      // Validate that the settings object has the expected structure
      const settings = snakeToCamelObject(data) as UserSettings;
      
      if (!settings.settings) {
        console.error(`Settings object is missing the 'settings' property for user ${userId}`);
        userSettingsCache[userId].inProgress = false;
        return null;
      }
      
      // Ensure FSRS parameters exist
      if (!settings.settings.fsrsParams) {
        console.warn(`FSRS parameters missing in settings for user ${userId}, adding defaults`);
        
        // Add default FSRS parameters
        settings.settings.fsrsParams = defaultSettingsConfig.fsrsParams;
        
        // Update the settings in the database
        await this.updateUserSettings(userId, settings.settings);
      }
      
      // Update the cache
      userSettingsCache[userId] = {
        settings,
        timestamp: Date.now(),
        inProgress: false
      };

      return settings;
    } catch (error: any) {
      console.error(`Exception in getUserSettings for ${userId}: ${error.message}`, error);
      // Make sure to mark the request as no longer in progress
      if (userSettingsCache[userId]) {
        userSettingsCache[userId].inProgress = false;
      }
      return null;
    }
  },

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, settings: UserSettingsUpdate): Promise<UserSettings | null> {
    try {
      // First get current settings
      const currentSettings = await this.getUserSettings(userId);
      if (!currentSettings) {
        console.error(`Cannot update settings for user ${userId}: settings not found`);
        return null;
      }

      // Update settings
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .update({ settings })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error(`Error updating user settings: ${error.message}`);
        return null;
      }

      // Clear the FSRS cache for this user to ensure fresh settings are used
      fsrsService.clearFSRSCache(userId);
      console.log(`Cleared FSRS cache for user ${userId} after settings update`);
      
      const updatedSettings = snakeToCamelObject(data) as UserSettings;
      
      // Update the cache
      userSettingsCache[userId] = {
        settings: updatedSettings,
        timestamp: Date.now(),
        inProgress: false
      };

      return updatedSettings;
    } catch (error: any) {
      console.error(`Exception in updateUserSettings: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Clear the settings cache for a specific user or all users
   */
  clearSettingsCache(userId?: string): void {
    if (userId) {
      delete userSettingsCache[userId];
    } else {
      Object.keys(userSettingsCache).forEach(key => {
        delete userSettingsCache[key];
      });
    }
  }
}; 
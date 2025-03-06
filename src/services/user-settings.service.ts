import { supabaseAdmin } from '../config/supabase';
import { snakeToCamelObject } from '../utils';
import defaultSettingsConfig from '../config/default-settings.json';

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
      // Get default settings from config file
      const defaultSettings = defaultSettingsConfig;

      // Check if settings already exist
      const existingSettings = await this.getUserSettings(userId);
      if (existingSettings) {
        console.log(`Settings already exist for user ${userId}`);
        return existingSettings;
      }

      // Insert new settings
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: userId,
          settings: defaultSettings
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating default settings: ${error.message}`);
        return null;
      }
      
      console.log(`Default settings created successfully`);
      return snakeToCamelObject(data) as UserSettings;
    } catch (error: any) {
      console.error(`Exception creating default settings: ${error.message}`);
      return null;
    }
  },

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found
          return null;
        }
        console.error(`Error getting user settings: ${error.message}`);
        return null;
      }

      return snakeToCamelObject(data) as UserSettings;
    } catch (error: any) {
      console.error(`Exception in getUserSettings: ${error.message}`);
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

      return snakeToCamelObject(data) as UserSettings;
    } catch (error: any) {
      console.error(`Exception in updateUserSettings: ${error.message}`);
      return null;
    }
  }
}; 
import { supabaseAdmin, supabaseAnon } from '../config/supabase';
import { userSettingsService } from './user-settings.service';

interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
}

interface SignInData {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp({ email, password, fullName }: SignUpData) {
    console.log(`Signing up user: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        full_name: fullName || '',
      },
    });

    if (error) {
      console.error(`Error creating user: ${email}`, error);
      throw error;
    }

    console.log(`User created successfully: ${email} with ID: ${data.user.id}`);

    // Create default settings for the new user
    try {
      console.log(`Attempting to create default settings for user: ${data.user.id}`);
      const settings = await userSettingsService.createDefaultSettings(data.user.id);
      console.log(`Settings creation result:`, settings ? 'Success' : 'Failed');
    } catch (settingsError) {
      console.error('Error creating default settings:', settingsError);
      // Continue even if settings creation fails
      // The user is still created successfully
    }

    return data;
  },

  /**
   * Sign in a user
   */
  async signIn({ email, password }: SignInData) {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Sign out a user
   */
  async signOut(_token: string) {
    const { error } = await supabaseAnon.auth.signOut({
      scope: 'global',
    });

    if (error) {
      throw error;
    }

    return { success: true };
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Refresh the access token using a refresh token
   * @param refreshToken The refresh token to use for obtaining a new access token
   * @returns New session data with refreshed tokens
   */
  async refreshToken(refreshToken: string) {
    console.log('Attempting to refresh token');
    
    // Create a new Supabase client session with the refresh token
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }

    console.log('Token refreshed successfully');
    return data;
  },
}; 
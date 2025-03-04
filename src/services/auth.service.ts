import { supabaseAdmin, supabaseAnon } from '../config/supabase';

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
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        full_name: fullName || '',
      },
    });

    if (error) {
      throw error;
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
  async signOut(token: string) {
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
}; 